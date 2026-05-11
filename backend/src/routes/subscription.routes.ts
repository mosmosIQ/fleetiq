import { Router } from "express";
import { getCurrentSubscription } from "../controllers/subscription.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { requireActiveTenant } from "../middleware/subscription.middleware";

const router = Router();

router.use(
  authMiddleware,
  requireTenant,
  requireRole("COMPANY_ADMIN"),
  requireActiveTenant
);

router.get("/current", getCurrentSubscription);

export default router;