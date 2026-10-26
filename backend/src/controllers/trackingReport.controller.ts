
import type { Request, Response, NextFunction } from "express";

import {
  generateTrackingReport as generateTrackingReportService,
  listTrackingReports as listTrackingReportsService,
  getTrackingReport as getTrackingReportService,
  deleteTrackingReport as deleteTrackingReportService,
} from "../services/trackingReport.service";

function getAuthUser(req: Request) {
  return (req as any).user as
    | { id?: string; user_id?: string; tenant_id?: string }
    | undefined;
}

function getTenantAndUser(req: Request) {
  const user = getAuthUser(req);

  const tenantId = user?.tenant_id;
  const userId = user?.id ?? user?.user_id;

  if (!tenantId) {
    throw new Error("Authenticated tenant was not found");
  }

  return { tenantId, userId };
}

function handleError(
  error: unknown,
  res: Response,
  next: NextFunction
) {
  if (
    error instanceof Error &&
    error.message === "Authenticated tenant was not found"
  ) {
    return res.status(401).json({ message: error.message });
  }

  return next(error);
}

export async function generateTrackingReport(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId, userId } = getTenantAndUser(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authenticated user was not found",
      });
    }

    const result = await generateTrackingReportService(
      tenantId,
      userId
    );

    return res.status(201).json({
      message: "Tracking report generated successfully",
      report: result.report,
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

export async function listTrackingReports(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId } = getTenantAndUser(req);

    const reports = await listTrackingReportsService(tenantId);

    return res.status(200).json({ reports });
  } catch (error) {
    return handleError(error, res, next);
  }
}

export async function downloadTrackingReport(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId } = getTenantAndUser(req);
    const reportId = req.params.id;

    if (!reportId) {
      return res.status(400).json({
        message: "Report ID is required",
      });
    }

    const report = await getTrackingReportService(
      tenantId,
      reportId
    );

    if (!report) {
      return res.status(404).json({
        message: "Tracking report not found",
      });
    }

    const fileBuffer = Buffer.isBuffer(report.file_data)
      ? report.file_data
      : Buffer.from(report.file_data);

    res.setHeader(
      "Content-Type",
      report.content_type ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${String(report.file_name).replace(/["\r\n]/g, "")}"`
    );

    res.setHeader("Content-Length", fileBuffer.length);

    return res.status(200).send(fileBuffer);
  } catch (error) {
    return handleError(error, res, next);
  }
}

export async function deleteTrackingReport(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId } = getTenantAndUser(req);
    const reportId = req.params.id;

    if (!reportId) {
      return res.status(400).json({
        message: "Report ID is required",
      });
    }

    const deleted = await deleteTrackingReportService(
      tenantId,
      reportId
    );

    if (!deleted) {
      return res.status(404).json({
        message: "Tracking report not found",
      });
    }

    return res.status(200).json({
      message: "Tracking report deleted successfully",
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}
