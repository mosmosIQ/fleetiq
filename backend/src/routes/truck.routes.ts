import { Router } from "express";
import {
  createTruck,
  listTrucks,
  updateTruckStatus
} from "../controllers/truck.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { createTruckSchema } from "../validators/truck.validator";
import { requireActiveTenant } from "../middleware/subscription.middleware";
const router = Router();

router.use(
  authMiddleware,
  requireTenant,
  requireRole("COMPANY_ADMIN"),
  requireActiveTenant
);

router.get("/", listTrucks);
router.post("/", validateBody(createTruckSchema), createTruck);
router.patch("/:id/status", updateTruckStatus);

export default router;