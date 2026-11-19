import { api } from "./api";

export type DriverDocumentType =
  | "PASSPORT"
  | "LICENSE"
  | "CHEMICAL_CERTIFICATE"
  | "DRIVER_CERTIFICATE";

export interface DriverDocumentMeta {
  id: string;
  document_type: DriverDocumentType;
  file_name?: string | null;
  mime_type?: string | null;
  created_at: string;
}

export interface DriverWithDocuments {
  id: string;
  full_name: string;
  phone_number: string;
  is_active: boolean;
  passport_number?: string | null;
  license_number?: string | null;
  license_expiry_date?: string | null;
  chemical_certificate_number?: string | null;
  chemical_certificate_expiry_date?: string | null;
  documents: DriverDocumentMeta[];
}

export interface DriverDocumentFile {
  id: string;
  document_type: DriverDocumentType;
  file_name?: string | null;
  file_url: string;
}

export async function listDriverDocuments() {
  const response = await api.get<DriverWithDocuments[]>("/driver-documents");
  return response.data;
}

export async function uploadDriverDocument(
  driverId: string,
  type: DriverDocumentType,
  data: { file_data: string; file_name?: string }
) {
  const response = await api.post(
    `/driver-documents/${driverId}/${type}`,
    data
  );
  return response.data;
}

export async function getDriverDocumentFile(documentId: string) {
  const response = await api.get<DriverDocumentFile>(
    `/driver-documents/file/${documentId}`
  );
  return response.data;
}

export async function deleteDriverDocument(documentId: string) {
  await api.delete(`/driver-documents/file/${documentId}`);
}
