import { Router } from "express";

import {
  createBatch,
  getBatch,
  listBatches
} from "../controllers/batch.controller";

import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { requireActiveTenant } from "../middleware/subscription.middleware";
import { validateBody } from "../middleware/validate.middleware";

import { createBatchSchema } from "../validators/batch.validator";

const router = Router();

router.use(
  authMiddleware,
  requireTenant,
  requireRole("COMPANY_ADMIN"),
  requireActiveTenant
);

router.get("/", listBatches);

router.post(
  "/",
  validateBody(createBatchSchema),
  createBatch
);

router.get("/:id", getBatch);

export default router;