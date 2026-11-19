import { api } from "./api";

export interface CompanyReport {
  month: string;
  trucks: {
    total_trucks: number;
    available_trucks: number;
    under_maintenance_trucks: number;
    inactive_trucks: number;
    active_trucks: number;
  };
  drivers: {
    total_drivers: number;
    active_drivers: number;
    available_drivers: number;
    drivers_on_trip: number;
  };
  trips: {
    total_trips: number;
    active_trips: number;
    completed_trips: number;
    delayed_trips: number;
    breakdown_trips: number;
    arrived_trips: number;
  };
  messages: {
    sms_sent: number;
    whatsapp_sent: number;
  };
  recent_trips: Array<{
    id: string;
    public_trip_code: string;
    route_from: string;
    route_to: string;
    status: string;
    created_at: string;
    plate_number: string;
    driver_name: string;
  }>;
}

export async function getCompanyReport() {
  const response = await api.get<CompanyReport>("/reports/company");
  return response.data;
}

export interface FleetAssignmentRow {
  truck_id: string;
  plate_number: string;
  truck_type?: string | null;
  capacity?: string | null;
  truck_status: string;
  trip_code?: string | null;
  trip_status?: string | null;
  trailer_number?: string | null;
  trailer_type?: string | null;
  trailer_model?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  passport_number?: string | null;
  license_number?: string | null;
  chemical_certificate_number?: string | null;
}

export async function getFleetAssignmentReport() {
  const response = await api.get<FleetAssignmentRow[]>(
    "/reports/fleet-assignments"
  );
  return response.data;
}

export async function downloadFleetAssignmentReport() {
  return api.get("/reports/fleet-assignments/export", {
    responseType: "blob"
  });
}
