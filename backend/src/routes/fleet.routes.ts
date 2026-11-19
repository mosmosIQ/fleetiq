import { Router } from "express";

import {
  createFleetUnit,
  listFleetUnits,
  updateFleetUnit
} from "../controllers/fleet.controller";

import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { requireActiveTenant } from "../middleware/subscription.middleware";
import { validateBody } from "../middleware/validate.middleware";

import {
  createFleetUnitSchema,
  updateFleetUnitSchema
} from "../validators/fleet.validator";

const router = Router();

router.use(
  authMiddleware,
  requireTenant,
  requireRole("COMPANY_ADMIN"),
  requireActiveTenant
);

router.get("/", listFleetUnits);
router.post("/", validateBody(createFleetUnitSchema), createFleetUnit);
router.patch("/:id", validateBody(updateFleetUnitSchema), updateFleetUnit);

export default router;
