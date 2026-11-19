
import { Router } from "express";

import {
  createDriver,
  listDrivers,
  updateDriver
} from "../controllers/driver.controller";

import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { validateBody } from "../middleware/validate.middleware";
import {
  createDriverSchema,
  updateDriverSchema
} from "../validators/driver.validator";
import { requireActiveTenant } from "../middleware/subscription.middleware";

const router = Router();

router.use(
  authMiddleware,
  requireTenant,
  requireRole("COMPANY_ADMIN"),
  requireActiveTenant
);

router.get("/", listDrivers);

router.post(
  "/",
  validateBody(createDriverSchema),
  createDriver
);

router.patch(
  "/:id",
  validateBody(updateDriverSchema),
  updateDriver
);

export default router;
