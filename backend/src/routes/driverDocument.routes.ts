import { Router } from "express";

import {
  deleteDriverDocument,
  getDriverDocumentFile,
  listDriverDocuments,
  uploadDriverDocument
} from "../controllers/driverDocument.controller";

import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { requireActiveTenant } from "../middleware/subscription.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { uploadDriverDocumentSchema } from "../validators/driverDocument.validator";

const router = Router();

router.use(
  authMiddleware,
  requireTenant,
  requireRole("COMPANY_ADMIN"),
  requireActiveTenant
);

router.get("/", listDriverDocuments);

router.get("/file/:documentId", getDriverDocumentFile);
router.delete("/file/:documentId", deleteDriverDocument);

router.post(
  "/:driverId/:type",
  validateBody(uploadDriverDocumentSchema),
  uploadDriverDocument
);

export default router;
