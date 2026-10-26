
import { api } from "./api";

export type RouteDirection = "NORTHBOUND" | "SOUTHBOUND";

export interface RouteTemplate {
  id: string;
  name: string;
  direction: RouteDirection;
  checkpoints: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRouteTemplateInput {
  name: string;
  direction: RouteDirection;
  checkpoints: string[];
}

export async function listRouteTemplates() {
  const response = await api.get<RouteTemplate[]>("/route-templates");
  return response.data;
}

export async function createRouteTemplate(
  input: CreateRouteTemplateInput
) {
  const response = await api.post<RouteTemplate>(
    "/route-templates",
    input
  );
  return response.data;
}

export async function updateRouteTemplate(
  id: string,
  input: {
    name?: string;
    checkpoints?: string[];
    is_active?: boolean;
  }
) {
  const response = await api.patch<RouteTemplate>(
    `/route-templates/${id}`,
    input
  );
  return response.data;
}

export async function archiveRouteTemplate(id: string) {
  const response = await api.delete<RouteTemplate>(
    `/route-templates/${id}`
  );
  return response.data;
}
