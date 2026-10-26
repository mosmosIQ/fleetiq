
import { api } from "./api";

export interface TrackingReport {
  id: string;
  report_number: number;
  file_name: string;
  generated_at: string;
  northbound_count: number;
  southbound_count: number;
  generated_by_user_id: string;
  generated_by_name: string | null;
}

export async function generateTrackingReport() {
  const response = await api.post<{
    message: string;
    report: TrackingReport;
  }>("/tracking-reports/generate");

  return response.data;
}

export async function listTrackingReports() {
  const response = await api.get<TrackingReport[]>(
    "/tracking-reports"
  );

  return response.data;
}

export async function downloadTrackingReport(
  reportId: string
) {
  const response = await api.get(
    `/tracking-reports/${reportId}/download`,
    {
      responseType: "blob"
    }
  );

  return response;
}

export async function deleteTrackingReport(reportId: string) {
  const response = await api.delete<{ message: string }>(
    `/tracking-reports/${reportId}`
  );

  return response.data;
}
