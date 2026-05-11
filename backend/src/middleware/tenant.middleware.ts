import { NextFunction, Request, Response } from "express";

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.tenant_id) {
    return res.status(400).json({ message: "Tenant context is required" });
  }

  next();
}
