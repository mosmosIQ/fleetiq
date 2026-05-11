import { Request, Response } from "express";
import * as reportService from "../services/report.service";

export async function getCompanyReport(req: Request, res: Response) {
  const report = await reportService.getCompanyReport(req.user!.tenant_id!);
  res.json(report);
}