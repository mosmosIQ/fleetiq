import { api } from "./api";

export interface SuperAdminOverview {
  month: string;
  companies: {
    total_companies: number;
    active_companies: number;
    suspended_companies: number;
    archived_companies: number;
  };
  plans: {
    standard: number;
    premium: number;
  };
  fleet: {
    total_trucks: number;
    total_drivers: number;
    total_trips: number;
    active_trips: number;
    completed_trips: number;
    delayed_trips: number;
    breakdown_trips: number;
  };
  messages: {
    sms_sent: number;
    whatsapp_sent: number;
  };
  recent_companies: Array<{
    id: string;
    company_name: string;
    company_code: string;
    contact_email: string;
    phone?: string;
    status: string;
    plan_name?: string;
    created_at: string;
  }>;
}

export async function getSuperAdminOverview() {
  const response = await api.get<SuperAdminOverview>("/super-admin/overview");
  return response.data;
}