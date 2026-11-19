import { api } from "./api";
import type { Trailer } from "./trailerService";
import type { Driver } from "./driverService";

export interface FleetUnit {
  id: string;
  plate_number: string;
  truck_type?: string | null;
  capacity?: string | null;
  status: string;
  created_at: string;
  assigned_trailer_id?: string | null;
  assigned_driver_id?: string | null;
  active_trip_id?: string | null;
  active_trip_code?: string | null;

  trailer_number?: string | null;
  trailer_type?: string | null;
  trailer_model?: string | null;
  trailer_status?: string | null;
  trailer_active_trip_code?: string | null;

  driver_name?: string | null;
  driver_phone?: string | null;
  driver_passport_number?: string | null;
  driver_license_number?: string | null;
  driver_license_expiry_date?: string | null;
  driver_chemical_certificate_number?: string | null;
  driver_chemical_certificate_expiry_date?: string | null;
  driver_is_active?: boolean | null;
  driver_joining_date?: string | null;
  driver_leaving_date?: string | null;
  driver_active_trip_code?: string | null;
}

export interface FleetListResponse {
  units: FleetUnit[];
  unlinked_trailers: (Trailer & { active_trip_id?: string | null })[];
  unlinked_drivers: Driver[];
}

export interface TruckData {
  plate_number?: string;
  truck_type?: string;
  capacity?: string;
  status?: string;
}

export interface TrailerData {
  trailer_number?: string;
  trailer_type?: string;
  trailer_model?: string;
  status?: string;
}

export interface DriverData {
  full_name?: string;
  phone_number?: string;
  passport_number?: string;
  license_number?: string;
  license_expiry_date?: string;
  chemical_certificate_number?: string;
  chemical_certificate_expiry_date?: string;
  joining_date?: string;
  leaving_date?: string;
}

export type LinkAction = "keep" | "unlink" | "link_existing" | "create_new";

export interface TrailerInstruction {
  action: LinkAction;
  id?: string;
  data?: TrailerData;
}

export interface DriverInstruction {
  action: LinkAction;
  id?: string;
  data?: DriverData;
}

export async function listFleetUnits() {
  const response = await api.get<FleetListResponse>("/fleet-units");
  return response.data;
}

export async function createFleetUnit(data: {
  truck: TruckData;
  trailer?: TrailerInstruction;
  driver?: DriverInstruction;
}) {
  const response = await api.post<{ id: string }>("/fleet-units", data);
  return response.data;
}

export async function updateFleetUnit(
  truckId: string,
  data: {
    truck?: TruckData;
    trailer?: TrailerInstruction;
    driver?: DriverInstruction;
  }
) {
  const response = await api.patch<{ id: string }>(
    `/fleet-units/${truckId}`,
    data
  );
  return response.data;
}
