
import { Router } from "express";
import {
  createTruck,
  listTrucks,
  updateTruck,
  updateTruckStatus
} from "../controllers/truck.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { requireActiveTenant } from "../middleware/subscription.middleware";
import {
  createTruckSchema,
  updateTruckSchema,
  updateTruckStatusSchema
} from "../validators/truck.validator";

const router = Router();

router.use(
  authMiddleware,
  requireTenant,
  requireRole("COMPANY_ADMIN"),
  requireActiveTenant
);

router.get("/", listTrucks);

router.post(
  "/",
  validateBody(createTruckSchema),
  createTruck
);

router.patch(
  "/:id",
  validateBody(updateTruckSchema),
  updateTruck
);

router.patch(
  "/:id/status",
  validateBody(updateTruckStatusSchema),
  updateTruckStatus
);

export default router;
