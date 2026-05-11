import { api } from "./api";

export interface SubscriptionSummary {
  plan_name: "STANDARD" | "PREMIUM";
  subscription_status: string;
  current_period_start: string;
  current_period_end: string;
  month: string;
  limits: {
    trucks: number;
    drivers: number;
    company_admins: number;
    sms: number;
    whatsapp: number;
  };
  usage: {
    trucks: number;
    drivers: number;
    company_admins: number;
    sms: number;
    whatsapp: number;
  };
}

export async function getCurrentSubscription() {
  const response = await api.get<SubscriptionSummary>("/subscriptions/current");
  return response.data;
}