import { Request, Response } from "express";
import * as service from "../services/driverDocument.service";

function fail(res: Response, error: unknown, fallback: string, status = 400) {
  res.status(status).json({
    message: error instanceof Error ? error.message : fallback
  });
}

export async function listDriverDocuments(req: Request, res: Response) {
  try {
    res.json(await service.listDriverDocuments(req.user!.tenant_id!));
  } catch (error) {
    console.error("Failed to list driver documents:", error);
    fail(res, error, "Failed to load driver documents.", 500);
  }
}

export async function uploadDriverDocument(req: Request, res: Response) {
  try {
    const result = await service.uploadDriverDocument(
      req.user!.tenant_id!,
      req.params.driverId,
      req.params.type,
      req.body
    );
    res.status(201).json(result);
  } catch (error) {
    fail(res, error, "Failed to upload document.");
  }
}

export async function getDriverDocumentFile(req: Request, res: Response) {
  try {
    res.json(
      await service.getDriverDocumentFile(
        req.user!.tenant_id!,
        req.params.documentId
      )
    );
  } catch (error) {
    fail(res, error, "Document not found.", 404);
  }
}

export async function deleteDriverDocument(req: Request, res: Response) {
  try {
    await service.deleteDriverDocument(
      req.user!.tenant_id!,
      req.params.documentId
    );
    res.status(204).send();
  } catch (error) {
    fail(res, error, "Failed to delete document.");
  }
}
