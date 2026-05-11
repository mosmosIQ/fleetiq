import { Router } from "express";
import {
  changePassword,
  login,
  me
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { changePasswordSchema } from "../validators/auth.validator";

const router = Router();

router.post("/login", login);
router.get("/me", authMiddleware, me);

router.patch(
  "/change-password",
  authMiddleware,
  validateBody(changePasswordSchema),
  changePassword
);

export default router;