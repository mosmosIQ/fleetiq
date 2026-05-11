import { Router } from "express";
import { getSuperAdminOverview } from "../controllers/superAdmin.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.use(authMiddleware, requireRole("SUPER_ADMIN"));

router.get("/overview", getSuperAdminOverview);

export default router;