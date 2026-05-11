import { Router } from "express";
import { inboundSms } from "../controllers/sms.controller";
import { validateBody } from "../middleware/validate.middleware";
import { inboundSmsSchema } from "../validators/sms.validator";

const router = Router();
router.post("/inbound", validateBody(inboundSmsSchema), inboundSms);
export default router;
