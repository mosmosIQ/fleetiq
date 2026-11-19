import { Router } from "express";

import {
  deleteTruckDocument,
  getTruckDocumentFile,
  listTruckDocuments,
  updateTruckInsurance,
  uploadTruckDocument
} from "../controllers/truckDocument.controller";

import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { requireActiveTenant } from "../middleware/subscription.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { updateTruckInsuranceSchema } from "../validators/truckDocument.validator";
import { uploadDriverDocumentSchema } from "../validators/driverDocument.validator";

const router = Router();

router.use(
  authMiddleware,
  requireTenant,
  requireRole("COMPANY_ADMIN"),
  requireActiveTenant
);

router.get("/", listTruckDocuments);

router.get("/file/:documentId", getTruckDocumentFile);
router.delete("/file/:documentId", deleteTruckDocument);

router.patch(
  "/:truckId/insurance",
  validateBody(updateTruckInsuranceSchema),
  updateTruckInsurance
);

router.post(
  "/:truckId/:type",
  validateBody(uploadDriverDocumentSchema),
  uploadTruckDocument
);

export default router;
