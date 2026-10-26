import { Router } from "express";

import {
  listTrailers,
  createTrailer,
  updateTrailerStatus
} from "../controllers/trailer.controller";

import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { requireActiveTenant } from "../middleware/subscription.middleware";
import { validateBody } from "../middleware/validate.middleware";

import {
  createTrailerSchema,
  updateTrailerStatusSchema
} from "../validators/trailer.validator";

const router = Router();

router.use(
  authMiddleware,
  requireTenant,
  requireRole("COMPANY_ADMIN"),
  requireActiveTenant
);

router.get("/", listTrailers);

router.post(
  "/",
  validateBody(createTrailerSchema),
  createTrailer
);

router.patch(
  "/:id/status",
  validateBody(updateTrailerStatusSchema),
  updateTrailerStatus
);

export default router;