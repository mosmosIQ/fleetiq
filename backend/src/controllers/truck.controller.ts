
import { Request, Response } from "express";
import * as truckService from "../services/truck.service";

export async function listTrucks(req: Request, res: Response) {
  try {
    const trucks = await truckService.listTrucks(
      req.user!.tenant_id!
    );

    res.json(trucks);
  } catch (error) {
    console.error("Failed to list trucks:", error);

    res.status(500).json({
      message: "Failed to load trucks."
    });
  }
}

export async function createTruck(req: Request, res: Response) {
  try {
    const truck = await truckService.createTruck(
      req.user!.tenant_id!,
      req.body
    );

    res.status(201).json(truck);
  } catch (error) {
    console.error("Failed to create truck:", error);

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to create truck."
    });
  }
}

export async function updateTruckStatus(
  req: Request,
  res: Response
) {
  try {
    const truck = await truckService.updateTruckStatus(
      req.user!.tenant_id!,
      req.params.id,
      req.body.status
    );

    res.json(truck);
  } catch (error) {
    console.error("Failed to update truck status:", error);

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to update truck status."
    });
  }
}
