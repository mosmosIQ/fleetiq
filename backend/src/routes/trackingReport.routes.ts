
import { Router } from "express";

import {
  generateTrackingReport,
  listTrackingReports,
  downloadTrackingReport,
  deleteTrackingReport,
} from "../controllers/trackingReport.controller";

import { authMiddleware } from "../middleware/auth.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { requireRole } from "../middleware/role.middleware";
import { requireActiveTenant } from "../middleware/subscription.middleware";

const router = Router();

// Protect all tracking report endpoints.
router.use(
  authMiddleware,
  requireTenant,
  requireRole("COMPANY_ADMIN"),
  requireActiveTenant
);

// Generate a new tracking report.
router.post("/generate", generateTrackingReport);

// List previously generated reports.
router.get("/", listTrackingReports);

// Download a report by its ID.
router.get("/:id/download", downloadTrackingReport);

// Delete a report by its ID.
router.delete("/:id", deleteTrackingReport);

export default router;
