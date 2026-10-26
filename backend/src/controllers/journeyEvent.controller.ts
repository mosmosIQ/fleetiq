import { Request, Response } from "express";
import * as journeyEventService from "../services/journeyEvent.service";

export async function listJourneyEvents(
  req: Request,
  res: Response
) {
  try {
    const events =
      await journeyEventService.listJourneyEvents(
        req.user!.tenant_id!,
        req.params.tripId
      );

    res.json(events);
  } catch (error) {
    res.status(404).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to list journey events"
    });
  }
}

export async function createJourneyEvent(
  req: Request,
  res: Response
) {
  try {
    const event =
      await journeyEventService.createJourneyEvent(
        req.user!.tenant_id!,
        req.params.tripId,
        req.body
      );

    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to create journey event"
    });
  }
}