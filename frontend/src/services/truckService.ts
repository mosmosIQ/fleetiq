import { api } from "./api";

export interface Truck {
  id: string;
  plate_number: string;
  truck_type?: string;
  capacity?: string;
  status: string;
  active_trip_id?: string | null;
  active_trip_code?: string | null;
  active_trip_status?: string | null;
  can_change_status?: boolean;
  created_at: string;
}

export interface CreateTruckInput {
  plate_number: string;
  truck_type?: string;
  capacity?: string;
  status?: string;
}

export async function listTrucks() {
  const response = await api.get<Truck[]>("/trucks");
  return response.data;
}

export async function createTruck(data: CreateTruckInput) {
  const response = await api.post<Truck>("/trucks", data);
  return response.data;
}

export async function updateTruckStatus(truckId: string, status: string) {
  const response = await api.patch<Truck>(`/trucks/${truckId}/status`, {
    status
  });

  return response.data;
}