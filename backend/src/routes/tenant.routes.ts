import { Router } from "express";
import {
  createTenant,
  listTenants,
  updateTenantPlan,
  updateTenantStatus
} from "../controllers/tenant.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { createTenantSchema } from "../validators/tenant.validator";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("SUPER_ADMIN"));

router.get("/", listTenants);
router.post("/", validateBody(createTenantSchema), createTenant);
router.patch("/:id/plan", updateTenantPlan);
router.patch("/:id/status", updateTenantStatus);

export default router;