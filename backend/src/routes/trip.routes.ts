import { Router } from "express";
import {
  completeTrip,
  createTrip,
  listTrips,
  updateTripStatus
} from "../controllers/trip.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { validateBody } from "../middleware/validate.middleware";
import {
  createTripSchema,
  updateTripStatusSchema
} from "../validators/trip.validator";
import { requireActiveTenant } from "../middleware/subscription.middleware";

const router = Router();

router.use(
  authMiddleware,
  requireTenant,
  requireRole("COMPANY_ADMIN"),
  requireActiveTenant
);

router.get("/", listTrips);
router.post("/", validateBody(createTripSchema), createTrip);

router.patch(
  "/:id/status",
  validateBody(updateTripStatusSchema),
  updateTripStatus
);

router.patch("/:id/complete", completeTrip);

export default router;