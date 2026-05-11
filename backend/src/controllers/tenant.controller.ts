import { Request, Response } from "express";
import * as tenantService from "../services/tenant.service";

export async function createTenant(req: Request, res: Response) {
  try {
    const tenant = await tenantService.createTenantWithAdmin(req.body);
    res.status(201).json(tenant);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Failed to create company"
    });
  }
}

export async function listTenants(_req: Request, res: Response) {
  const tenants = await tenantService.listTenants();
  res.json(tenants);
}

export async function updateTenantPlan(req: Request, res: Response) {
  try {
    const result = await tenantService.updateTenantPlan(
      req.params.id,
      req.body.plan_name
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Failed to update company plan"
    });
  }
}

export async function updateTenantStatus(req: Request, res: Response) {
  try {
    const result = await tenantService.updateTenantStatus(
      req.params.id,
      req.body.status
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to update company status"
    });
  }
}