import { Router } from "express";
import {
  listNotifications,
  markNotificationAsRead
} from "../controllers/notification.controller";
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

router.get("/", listNotifications);
router.patch("/:id/read", markNotificationAsRead);

export default router;