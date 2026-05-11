import { Request, Response } from "express";
import * as userService from "../services/user.service";

export async function listCompanyUsers(req: Request, res: Response) {
  const users = await userService.listCompanyUsers(req.user!.tenant_id!);
  res.json(users);
}

export async function createCompanyAdmin(req: Request, res: Response) {
  try {
    const user = await userService.createCompanyAdmin(
      req.user!.tenant_id!,
      req.body
    );

    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Failed to create user"
    });
  }
}

export async function deactivateCompanyUser(req: Request, res: Response) {
  try {
    const user = await userService.deactivateCompanyUser(
      req.user!.tenant_id!,
      req.params.id,
      req.user!.id
    );

    res.json(user);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Failed to deactivate user"
    });
  }
}

export async function reactivateCompanyUser(req: Request, res: Response) {
  try {
    const user = await userService.reactivateCompanyUser(
      req.user!.tenant_id!,
      req.params.id
    );

    res.json(user);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Failed to reactivate user"
    });
  }
}