import { Request, Response } from "express";
import * as fleetService from "../services/fleet.service";

export async function listFleetUnits(req: Request, res: Response) {
  try {
    res.json(await fleetService.listFleetUnits(req.user!.tenant_id!));
  } catch (error) {
    console.error("Failed to list fleet units:", error);
    res.status(500).json({ message: "Failed to load fleet." });
  }
}

export async function createFleetUnit(req: Request, res: Response) {
  try {
    const unit = await fleetService.createFleetUnit(
      req.user!.tenant_id!,
      req.body
    );
    res.status(201).json(unit);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to create fleet unit."
    });
  }
}

export async function updateFleetUnit(req: Request, res: Response) {
  try {
    const unit = await fleetService.updateFleetUnit(
      req.user!.tenant_id!,
      req.params.id,
      req.body
    );
    res.json(unit);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to update fleet unit."
    });
  }
}
