import { api } from "./api";

export async function register(
  companyName: string,
  email: string,
  password: string
) {
  const response = await api.post("/auth/register", {
    company_name: companyName,
    email,
    password
  });

  return response.data;
}

export async function login(email: string, password: string) {
  const response = await api.post("/auth/login", {
    email,
    password
  });

  return response.data;
}

export async function getMe() {
  const response = await api.get("/auth/me");

  return response.data.user;
}

export async function changePassword(data: {
  current_password: string;
  new_password: string;
}) {
  const response = await api.patch(
    "/auth/change-password",
    data
  );

  return response.data;
}