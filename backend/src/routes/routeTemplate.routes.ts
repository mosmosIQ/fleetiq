
import { Router } from "express";

import {
  listRouteTemplates,
  createRouteTemplate,
  updateRouteTemplate,
  archiveRouteTemplate
} from "../controllers/routeTemplate.controller";

import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { requireActiveTenant } from "../middleware/subscription.middleware";
import { validateBody } from "../middleware/validate.middleware";

import {
  createRouteTemplateSchema,
  updateRouteTemplateSchema
} from "../validators/routeTemplate.validator";

const router = Router();

router.use(
  authMiddleware,
  requireTenant,
  requireRole("COMPANY_ADMIN"),
  requireActiveTenant
);

router.get("/", listRouteTemplates);

router.post(
  "/",
  validateBody(createRouteTemplateSchema),
  createRouteTemplate
);

router.patch(
  "/:id",
  validateBody(updateRouteTemplateSchema),
  updateRouteTemplate
);

router.delete("/:id", archiveRouteTemplate);

export default router;
