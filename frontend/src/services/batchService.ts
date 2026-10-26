
import { api } from "./api";

export type BatchDirection = "NORTHBOUND" | "SOUTHBOUND";

export interface Batch {
  id: string;
  batch_number: number;
  direction: BatchDirection;
  route_template_id?: string | null;
  checkpoint_snapshot: string[];
  loading_point?: string | null;
  truck_handover_date?: string | null;
  loading_date?: string | null;
  tons?: number | null;
  release_date?: string | null;
  notes?: string | null;
  trip_id?: string | null;
  trip_code?: string | null;
  trip_status?: string | null;
  plate_number?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  trailer_number?: string | null;
  trailer_type?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBatchInput {
  direction: BatchDirection;
  route_template_id: string;
  loading_point?: string;
  truck_handover_date?: string;
  loading_date?: string;
  tons?: number;
  release_date?: string;
  notes?: string;
}

export async function listBatches() {
  const response = await api.get<Batch[]>("/batches");
  return response.data;
}

export async function createBatch(data: CreateBatchInput) {
  const response = await api.post<Batch>("/batches", data);
  return response.data;
}

export async function getBatch(batchId: string) {
  const response = await api.get<Batch>(`/batches/${batchId}`);
  return response.data;
}
