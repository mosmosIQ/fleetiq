import { Request, Response } from "express";
import * as smsService from "../services/sms.service";

export async function inboundSms(req: Request, res: Response) {
  try {
    const result = await smsService.handleInboundSms({
      from: req.body.from,
      text: req.body.text,
      providerMessageId: req.body.messageId
    });

    return res.json(result);
  } catch (error) {
    console.error("Inbound SMS failed:", error);

    return res.status(500).json({
      message: "Failed to process inbound SMS",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}