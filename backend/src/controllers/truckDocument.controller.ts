import { Request, Response } from "express";
import * as service from "../services/truckDocument.service";

function fail(res: Response, error: unknown, fallback: string, status = 400) {
  res.status(status).json({
    message: error instanceof Error ? error.message : fallback
  });
}

export async function listTruckDocuments(req: Request, res: Response) {
  try {
    res.json(await service.listTruckDocuments(req.user!.tenant_id!));
  } catch (error) {
    console.error("Failed to list truck documents:", error);
    fail(res, error, "Failed to load truck documents.", 500);
  }
}

export async function updateTruckInsurance(req: Request, res: Response) {
  try {
    res.json(
      await service.updateTruckInsuranceDetails(
        req.user!.tenant_id!,
        req.params.truckId,
        req.body
      )
    );
  } catch (error) {
    fail(res, error, "Failed to save insurance details.");
  }
}

export async function uploadTruckDocument(req: Request, res: Response) {
  try {
    res.status(201).json(
      await service.uploadTruckDocument(
        req.user!.tenant_id!,
        req.params.truckId,
        req.params.type,
        req.body
      )
    );
  } catch (error) {
    fail(res, error, "Failed to upload document.");
  }
}

export async function getTruckDocumentFile(req: Request, res: Response) {
  try {
    res.json(
      await service.getTruckDocumentFile(
        req.user!.tenant_id!,
        req.params.documentId
      )
    );
  } catch (error) {
    fail(res, error, "Document not found.", 404);
  }
}

export async function deleteTruckDocument(req: Request, res: Response) {
  try {
    await service.deleteTruckDocument(
      req.user!.tenant_id!,
      req.params.documentId
    );
    res.status(204).send();
  } catch (error) {
    fail(res, error, "Failed to delete document.");
  }
}
