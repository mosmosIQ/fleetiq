import { Request, Response } from "express";
import * as trailerService from "../services/trailer.service";

export async function listTrailers(req: Request, res: Response) {
  try {
    const trailers = await trailerService.listTrailers(
      req.user!.tenant_id!
    );

    res.json(trailers);
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to list trailers"
    });
  }
}

export async function createTrailer(req: Request, res: Response) {
  try {
    const trailer = await trailerService.createTrailer(
      req.user!.tenant_id!,
      req.body
    );

    res.status(201).json(trailer);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to create trailer"
    });
  }
}

export async function updateTrailerStatus(
  req: Request,
  res: Response
) {
  try {
    const trailer = await trailerService.updateTrailerStatus(
      req.user!.tenant_id!,
      req.params.id,
      req.body.status
    );

    res.json(trailer);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to update trailer status"
    });
  }
}