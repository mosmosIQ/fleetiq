import { Request, Response } from "express";
import * as subscriptionService from "../services/subscription.service";

export async function getCurrentSubscription(req: Request, res: Response) {
  try {
    const summary = await subscriptionService.getTenantSubscriptionSummary(
      req.user!.tenant_id!
    );

    res.json(summary);
  } catch (error) {
    res.status(404).json({
      message:
        error instanceof Error ? error.message : "Subscription not found"
    });
  }
}