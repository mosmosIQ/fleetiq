import { api } from "./api";

export type TruckDocumentType = "TRUCK_INSURANCE";

export interface TruckDocumentMeta {
  id: string;
  document_type: TruckDocumentType;
  file_name?: string | null;
  mime_type?: string | null;
  created_at: string;
}

export interface TruckWithDocuments {
  id: string;
  plate_number: string;
  truck_type?: string | null;
  status: string;
  insurance_number?: string | null;
  insurance_expiry_date?: string | null;
  documents: TruckDocumentMeta[];
}

export interface TruckDocumentFile {
  id: string;
  document_type: TruckDocumentType;
  file_name?: string | null;
  file_url: string;
}

export async function listTruckDocuments() {
  const response = await api.get<TruckWithDocuments[]>("/truck-documents");
  return response.data;
}

export async function updateTruckInsurance(
  truckId: string,
  data: { insurance_number: string; insurance_expiry_date: string }
) {
  const response = await api.patch(
    `/truck-documents/${truckId}/insurance`,
    data
  );
  return response.data;
}

export async function uploadTruckDocument(
  truckId: string,
  type: TruckDocumentType,
  data: { file_data: string; file_name?: string }
) {
  const response = await api.post(`/truck-documents/${truckId}/${type}`, data);
  return response.data;
}

export async function getTruckDocumentFile(documentId: string) {
  const response = await api.get<TruckDocumentFile>(
    `/truck-documents/file/${documentId}`
  );
  return response.data;
}

export async function deleteTruckDocument(documentId: string) {
  await api.delete(`/truck-documents/file/${documentId}`);
}
