import { api } from "./api";
export async function list() {
  const response = await api.get("/documents");
  return response.data;
}
