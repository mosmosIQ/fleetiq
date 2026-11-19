import { Request, Response } from "express";
import * as reportService from "../services/report.service";

export async function getCompanyReport(req: Request, res: Response) {
  const report = await reportService.getCompanyReport(req.user!.tenant_id!);
  res.json(report);
}

export async function getFleetAssignmentReport(req: Request, res: Response) {
  try {
    const rows = await reportService.getFleetAssignmentReport(
      req.user!.tenant_id!
    );
    res.json(rows);
  } catch (error) {
    console.error("Failed to load fleet assignment report:", error);
    res.status(500).json({ message: "Failed to load fleet report." });
  }
}

export async function exportFleetAssignmentReport(req: Request, res: Response) {
  try {
    const buffer = await reportService.buildFleetAssignmentWorkbook(
      req.user!.tenant_id!
    );
    const stamp = new Date().toISOString().slice(0, 10);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="FLEET ASSIGNMENT REPORT ${stamp}.xlsx"`
    );
    res.send(buffer);
  } catch (error) {
    console.error("Failed to export fleet assignment report:", error);
    res.status(500).json({ message: "Failed to export fleet report." });
  }
}
