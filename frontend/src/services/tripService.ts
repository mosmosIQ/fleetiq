import { api } from "./api";

export type TripDestinationCountry = "DRC" | "ZAMBIA";
export interface Trip {
  id: string; public_trip_code: string; truck_id: string; driver_id: string;
  trailer_id?: string | null; batch_id?: string | null; plate_number: string;
  truck_type?: string | null; truck_status?: string | null; driver_name: string;
  driver_phone?: string | null; trailer_number?: string | null; trailer_type?: string | null;
  trailer_status?: string | null; batch_number?: number | null;
  batch_direction?: "NORTHBOUND" | "SOUTHBOUND" | null; loading_point?: string | null;
  truck_handover_date?: string | null; loading_date?: string | null; tons?: number | null;
  release_date?: string | null; route_from: string; route_to: string;
  destination_country?: TripDestinationCountry | null; cargo_description?: string | null;
  status: string; planned_start_at?: string | null; expected_arrival_at?: string | null;
  last_update_source?: string | null; last_update_at?: string | null; created_at: string;
}
export interface CreateTripInput {
  truck_id: string; driver_id: string; trailer_id?: string; batch_id?: string;
  route_from: string; route_to: string; destination_country: TripDestinationCountry;
  cargo_description?: string; planned_start_at?: string; expected_arrival_at?: string;
}
export type ManualTripStatus = "STARTED" | "ON_ROUTE" | "ARRIVED" | "DELAYED" | "BREAKDOWN";
export type JourneyEventType = "HANDOVER" | "LOADING" | "RELEASE" | "ARRIVAL" | "DEPARTURE" | "FINAL_ARRIVAL" | "FINAL_OFFLOADING";
export interface JourneyEvent {
  id: string; tenant_id?: string; trip_id: string; batch_id?: string | null;
  checkpoint: string; event_type: JourneyEventType; location?: string | null;
  occurred_at: string; notes?: string | null; latitude?: number | null; longitude?: number | null;
  source?: string | null; created_at: string; trip_code?: string | null;
  batch_number?: number | null; batch_direction?: "NORTHBOUND" | "SOUTHBOUND" | null;
}
export interface CreateJourneyEventInput {
  checkpoint?: string; event_type: JourneyEventType; location?: string; occurred_at?: string;
  notes?: string; latitude?: number; longitude?: number; source?: string;
}
export async function listTrips() { const r = await api.get<Trip[]>("/trips"); return r.data; }
export async function createTrip(data: CreateTripInput) { const r = await api.post<Trip>("/trips", data); return r.data; }
export async function updateTripStatus(tripId: string, status: ManualTripStatus) {
  const r = await api.patch(`/trips/${tripId}/status`, { status }); return r.data;
}
export async function completeTrip(tripId: string) { const r = await api.patch(`/trips/${tripId}/complete`); return r.data; }
export async function listJourneyEvents(tripId: string) {
  const r = await api.get<JourneyEvent[]>(`/journey-events/trips/${tripId}`); return r.data;
}
export async function createJourneyEvent(tripId: string, data: CreateJourneyEventInput) {
  const r = await api.post<JourneyEvent>(`/journey-events/trips/${tripId}`, data); return r.data;
}
