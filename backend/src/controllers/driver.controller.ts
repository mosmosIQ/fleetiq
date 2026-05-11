import { Request, Response } from "express";
import * as driverService from "../services/driver.service";

export async function listDrivers(req: Request, res: Response) {
  const drivers = await driverService.listDrivers(req.user!.tenant_id!);
  res.json(drivers);
}

export async function createDriver(req: Request, res: Response) {
  try {
    const driver = await driverService.createDriver(
      req.user!.tenant_id!,
      req.body
    );

    res.status(201).json(driver);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Failed to create driver"
    });
  }
}