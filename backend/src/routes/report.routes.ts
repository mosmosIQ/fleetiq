import { Router } from "express";
import {
  exportFleetAssignmentReport,
  getCompanyReport,
  getFleetAssignmentReport
} from "../controllers/report.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { requireActiveTenant } from "../middleware/subscription.middleware";

const router = Router();

router.use(
  authMiddleware,
  requireTenant,
  requireRole("COMPANY_ADMIN"),
  requireActiveTenant
);

router.get("/company", getCompanyReport);
router.get("/fleet-assignments", getFleetAssignmentReport);
router.get("/fleet-assignments/export", exportFleetAssignmentReport);

export default router;