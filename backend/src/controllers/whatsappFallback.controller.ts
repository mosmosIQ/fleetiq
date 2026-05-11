import { Request, Response } from "express";
import * as fallbackService from "../services/whatsappFallback.service";

export async function runWhatsAppFallbackCheck(req: Request, res: Response) {
  try {
    const result = await fallbackService.processWhatsAppFallbacks(
      req.user!.tenant_id!
    );

    res.json(result);
  } catch (error) {
    console.error("WhatsApp fallback check failed:", error);

    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to process WhatsApp fallback"
    });
  }
}