import { api } from "./api";

export interface Company {
  id: string;
  company_name: string;
  company_code: string;
  contact_email: string;
  phone?: string;
  address?: string;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  plan_name?: "STANDARD" | "PREMIUM";
  subscription_status?: string;
  created_at: string;
}

export interface CreateCompanyInput {
  company_name: string;
  company_code: string;
  contact_email: string;
  phone?: string;
  address?: string;
  plan_name: "STANDARD" | "PREMIUM";
  admin_name: string;
  admin_email: string;
  admin_password: string;
}

export async function createCompany(data: CreateCompanyInput) {
  const response = await api.post("/tenants", data);
  return response.data;
}

export async function listCompanies() {
  const response = await api.get<Company[]>("/tenants");
  return response.data;
}

export async function updateCompanyPlan(
  companyId: string,
  planName: "STANDARD" | "PREMIUM"
) {
  const response = await api.patch(`/tenants/${companyId}/plan`, {
    plan_name: planName
  });

  return response.data;
}

export async function updateCompanyStatus(
  companyId: string,
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED"
) {
  const response = await api.patch(`/tenants/${companyId}/status`, {
    status
  });

  return response.data;
}