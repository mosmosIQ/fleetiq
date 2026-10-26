
import { Request, Response } from "express";
import * as routeTemplateService from "../services/routeTemplate.service";

export async function listRouteTemplates(req: Request, res: Response) {
  try {
    const result = await routeTemplateService.listRouteTemplates(
      req.user!.tenant_id!
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to load route templates"
    });
  }
}

export async function createRouteTemplate(req: Request, res: Response) {
  try {
    const result = await routeTemplateService.createRouteTemplate(
      req.user!.tenant_id!,
      req.body
    );
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create route template";
    res.status(message.includes("duplicate key") ? 409 : 400).json({ message });
  }
}

export async function updateRouteTemplate(req: Request, res: Response) {
  try {
    const result = await routeTemplateService.updateRouteTemplate(
      req.user!.tenant_id!,
      req.params.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to update route template"
    });
  }
}

export async function archiveRouteTemplate(req: Request, res: Response) {
  try {
    const result = await routeTemplateService.archiveRouteTemplate(
      req.user!.tenant_id!,
      req.params.id
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to archive route template"
    });
  }
}
