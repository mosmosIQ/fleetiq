import { Router } from "express";
import { runWhatsAppFallbackCheck } from "../controllers/whatsappFallback.controller";
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

router.post("/check", runWhatsAppFallbackCheck);

export default router;