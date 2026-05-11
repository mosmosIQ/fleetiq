import { Request, Response } from "express";
import * as superAdminService from "../services/superAdmin.service";

export async function getSuperAdminOverview(_req: Request, res: Response) {
  const overview = await superAdminService.getSuperAdminOverview();
  res.json(overview);
}