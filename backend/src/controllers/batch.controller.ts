import { Request, Response } from "express";
import * as batchService from "../services/batch.service";

export async function listBatches(req: Request, res: Response) {
  try {
    const batches = await batchService.listBatches(
      req.user!.tenant_id!
    );

    res.json(batches);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to list batches"
    });
  }
}


export async function createBatch(req: Request, res: Response) {
  try {
    const batch = await batchService.createBatch(
      req.user!.tenant_id!,
      req.body
    );

    res.status(201).json(batch);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to create batch"
    });
  }
}


export async function getBatch(req: Request, res: Response) {
  try {
    const batch = await batchService.getBatch(
      req.user!.tenant_id!,
      req.params.id
    );

    res.json(batch);
  } catch (error) {
    res.status(404).json({
      message:
        error instanceof Error
          ? error.message
          : "Batch not found"
    });
  }
}