import { api } from "./api";
import { LoginResponse, AuthUser } from "../types/auth.types";

export async function login(email: string, password: string) {
  const response = await api.post<LoginResponse>("/auth/login", {
    email,
    password
  });

  return response.data;
}

export async function getMe() {
  const response = await api.get<{ user: AuthUser }>("/auth/me");
  return response.data.user;
}

export async function changePassword(data: {
  current_password: string;
  new_password: string;
}) {
  const response = await api.patch("/auth/change-password", data);
  return response.data;
}