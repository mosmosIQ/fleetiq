import { Router } from "express";

import {
  listJourneyEvents,
  createJourneyEvent
} from "../controllers/journeyEvent.controller";

import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { requireActiveTenant } from "../middleware/subscription.middleware";
import { validateBody } from "../middleware/validate.middleware";

import {
  createJourneyEventSchema
} from "../validators/journeyEvent.validator";

const router = Router();

router.use(
  authMiddleware,
  requireTenant,
  requireRole("COMPANY_ADMIN"),
  requireActiveTenant
);

router.get(
  "/trips/:tripId",
  listJourneyEvents
);

router.post(
  "/trips/:tripId",
  validateBody(createJourneyEventSchema),
  createJourneyEvent
);

export default router;