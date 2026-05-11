import { Request, Response } from "express";
import * as tripService from "../services/trip.service";

export async function listTrips(req: Request, res: Response) {
  const trips = await tripService.listTrips(req.user!.tenant_id!);
  res.json(trips);
}

export async function createTrip(req: Request, res: Response) {
  try {
    const trip = await tripService.createTrip(req.user!.tenant_id!, req.body);
    res.status(201).json(trip);
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to create trip"
    });
  }
}

export async function updateTripStatus(req: Request, res: Response) {
  try {
    const result = await tripService.updateTripStatus(
      req.user!.tenant_id!,
      req.params.id,
      req.body.status
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Failed to update trip status"
    });
  }
}

export async function completeTrip(req: Request, res: Response) {
  try {
    const result = await tripService.completeTrip(
      req.user!.tenant_id!,
      req.params.id
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to complete trip"
    });
  }
}