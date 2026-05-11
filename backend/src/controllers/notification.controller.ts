import { Request, Response } from "express";
import * as notificationService from "../services/notification.service";

export async function listNotifications(req: Request, res: Response) {
  const notifications = await notificationService.listNotifications(
    req.user!.tenant_id!
  );

  res.json(notifications);
}

export async function markNotificationAsRead(req: Request, res: Response) {
  try {
    const notification = await notificationService.markNotificationAsRead(
      req.user!.tenant_id!,
      req.params.id
    );

    res.json(notification);
  } catch (error) {
    res.status(404).json({
      message:
        error instanceof Error ? error.message : "Notification not found"
    });
  }
}