import { api } from "./api";

export interface Driver {
  id: string;
  full_name: string;
  phone_number: string;
  license_number?: string;
  license_expiry_date?: string;
  is_active: boolean;
  active_trip_id?: string | null;
  active_trip_code?: string | null;
  availability_status?: "AVAILABLE" | "ON_TRIP";
  created_at: string;
}

export interface CreateDriverInput {
  full_name: string;
  phone_number: string;
  license_number?: string;
  license_expiry_date?: string;
}

export async function listDrivers() {
  const response = await api.get<Driver[]>("/drivers");
  return response.data;
}

export async function createDriver(data: CreateDriverInput) {
  const response = await api.post<Driver>("/drivers", data);
  return response.data;
}