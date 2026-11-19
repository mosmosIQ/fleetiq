import { api } from "./api";

export interface Trailer {
  id: string;
  trailer_number: string;
  trailer_type?: string | null;
  trailer_model?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTrailerInput {
  trailer_number: string;
  trailer_type?: string;
  trailer_model?: string;
  status?: string;
}

export interface UpdateTrailerInput {
  trailer_number?: string;
  trailer_type?: string;
  trailer_model?: string;
}

export async function listTrailers() {
  const response = await api.get<Trailer[]>("/trailers");

  return response.data;
}

export async function createTrailer(data: CreateTrailerInput) {
  const response = await api.post<Trailer>("/trailers", data);

  return response.data;
}

export async function updateTrailerStatus(
  trailerId: string,
  status: string
) {
  const response = await api.patch<Trailer>(
    `/trailers/${trailerId}/status`,
    { status }
  );

  return response.data;
}

export async function updateTrailer(
  trailerId: string,
  data: UpdateTrailerInput
) {
  const response = await api.patch<Trailer>(
    `/trailers/${trailerId}`,
    data
  );

  return response.data;
}
