
import { api } from "./api";

export interface Driver {
  id: string;
  full_name: string;
  phone_number: string;

  passport_number?: string | null;

  license_number?: string | null;
  license_expiry_date?: string | null;

  chemical_certificate_number?: string | null;
  chemical_certificate_expiry_date?: string | null;
  chemical_certificate_image?: string | null;

  is_active: boolean;
  active_trip_id?: string | null;
  active_trip_code?: string | null;
  availability_status?: "AVAILABLE" | "ON_TRIP";
  created_at: string;
}

export interface CreateDriverInput {
  full_name: string;
  phone_number: string;

  passport_number?: string;
  license_number?: string;
  license_expiry_date?: string;

  chemical_certificate_number?: string;
  chemical_certificate_expiry_date?: string;
  chemical_certificate_image?: string;
}

export async function listDrivers() {
  const response = await api.get<Driver[]>("/drivers");
  return response.data;
}

export async function createDriver(data: CreateDriverInput) {
  const response = await api.post<Driver>("/drivers", data);
  return response.data;
}
