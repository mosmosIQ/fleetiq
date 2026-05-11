import { NextFunction, Request, Response } from "express";
import { db } from "../config/db";

export async function requireActiveTenant(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tenantId = req.user?.tenant_id;

    if (!tenantId) {
      return res.status(400).json({
        message: "Tenant context is required"
      });
    }

    const result = await db.query(
      `
      SELECT
        t.status AS tenant_status,
        ts.status AS subscription_status
      FROM tenants t
      LEFT JOIN LATERAL (
        SELECT status
        FROM tenant_subscriptions
        WHERE tenant_id = t.id
        ORDER BY created_at DESC
        LIMIT 1
      ) ts ON true
      WHERE t.id = $1::uuid
      LIMIT 1
      `,
      [tenantId]
    );

    const tenant = result.rows[0];

    if (!tenant) {
      return res.status(404).json({
        message: "Company account not found"
      });
    }

    if (tenant.tenant_status !== "ACTIVE") {
      return res.status(403).json({
        message:
          "This company account is not active. Please contact the SaaS administrator."
      });
    }

    if (tenant.subscription_status !== "ACTIVE") {
      return res.status(403).json({
        message:
          "This company subscription is not active. Please contact the SaaS administrator."
      });
    }

    next();
  } catch (error) {
    console.error("Tenant status check failed:", error);

    return res.status(500).json({
      message: "Failed to verify company account status"
    });
  }
}