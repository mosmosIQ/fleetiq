
import { api } from "./api";

export type TruckStatus =
  | "AVAILABLE"
  | "UNDER_MAINTENANCE"
  | "ACCIDENTED"
  | "INACTIVE"
  | "ASSIGNED"
  | "ON_TRIP"
  | "ON_ROUTE"
  | "DELAYED"
  | "BREAKDOWN"
  | "ARRIVED";

export interface Truck {
  id: string;
  plate_number: string;
  truck_type?: string | null;
  capacity?: string | null;
  status: TruckStatus | string;
  active_trip_id?: string | null;
  active_trip_code?: string | null;
  active_trip_status?: string | null;
  can_change_status?: boolean;
  created_at: string;
}

export type ManageableTruckStatus =
  | "AVAILABLE"
  | "UNDER_MAINTENANCE"
  | "ACCIDENTED"
  | "INACTIVE";

export interface CreateTruckInput {
  plate_number: string;
  truck_type?: string;
  capacity?: string;
  status?: ManageableTruckStatus;
}

export async function listTrucks(): Promise<Truck[]> {
  const response = await api.get<Truck[]>("/trucks");
  return response.data;
}

export async function createTruck(
  data: CreateTruckInput
): Promise<Truck> {
  const response = await api.post<Truck>("/trucks", data);
  return response.data;
}

export async function updateTruckStatus(
  truckId: string,
  status: ManageableTruckStatus
): Promise<Truck> {
  const response = await api.patch<Truck>(
    `/trucks/${truckId}/status`,
    { status }
  );

  return response.data;
}
