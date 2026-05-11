import { api } from "./api";

export interface Trip {
  id: string;
  public_trip_code: string;
  truck_id: string;
  driver_id: string;
  plate_number: string;
  truck_type?: string;
  truck_status?: string;
  driver_name: string;
  driver_phone?: string;
  route_from: string;
  route_to: string;
  cargo_description?: string;
  status: string;
  planned_start_at?: string;
  expected_arrival_at?: string;
  last_update_source?: string | null;
  last_update_at?: string | null;
  created_at: string;
}

export interface CreateTripInput {
  truck_id: string;
  driver_id: string;
  route_from: string;
  route_to: string;
  cargo_description?: string;
  planned_start_at?: string;
  expected_arrival_at?: string;
}

export type ManualTripStatus =
  | "STARTED"
  | "ON_ROUTE"
  | "ARRIVED"
  | "DELAYED"
  | "BREAKDOWN";

export async function listTrips() {
  const response = await api.get<Trip[]>("/trips");
  return response.data;
}

export async function createTrip(data: CreateTripInput) {
  const response = await api.post<Trip>("/trips", data);
  return response.data;
}

export async function updateTripStatus(
  tripId: string,
  status: ManualTripStatus
) {
  const response = await api.patch(`/trips/${tripId}/status`, {
    status
  });

  return response.data;
}

export async function completeTrip(tripId: string) {
  const response = await api.patch(`/trips/${tripId}/complete`);
  return response.data;
}