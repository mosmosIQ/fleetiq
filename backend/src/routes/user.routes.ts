import { Router } from "express";
import {
  createCompanyAdmin,
  deactivateCompanyUser,
  listCompanyUsers,
  reactivateCompanyUser
} from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { requireActiveTenant } from "../middleware/subscription.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { createCompanyAdminSchema } from "../validators/user.validator";

const router = Router();

router.use(
  authMiddleware,
  requireTenant,
  requireRole("COMPANY_ADMIN"),
  requireActiveTenant
);

router.get("/", listCompanyUsers);
router.post("/", validateBody(createCompanyAdminSchema), createCompanyAdmin);
router.patch("/:id/deactivate", deactivateCompanyUser);
router.patch("/:id/reactivate", reactivateCompanyUser);

export default router;