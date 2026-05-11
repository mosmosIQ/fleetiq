import { api } from "./api";

export interface CompanyUser {
  id: string;
  full_name: string;
  email: string;
  role: "COMPANY_ADMIN";
  is_active: boolean;
  created_at: string;
}

export interface CreateCompanyUserInput {
  full_name: string;
  email: string;
  password: string;
}

export async function listCompanyUsers() {
  const response = await api.get<CompanyUser[]>("/users");
  return response.data;
}

export async function createCompanyUser(data: CreateCompanyUserInput) {
  const response = await api.post<CompanyUser>("/users", data);
  return response.data;
}

export async function deactivateCompanyUser(userId: string) {
  const response = await api.patch<CompanyUser>(`/users/${userId}/deactivate`);
  return response.data;
}

export async function reactivateCompanyUser(userId: string) {
  const response = await api.patch<CompanyUser>(`/users/${userId}/reactivate`);
  return response.data;
}