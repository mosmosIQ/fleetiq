
import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";

import {
  deleteTrackingReport,
  downloadTrackingReport,
  generateTrackingReport,
  listTrackingReports,
  type TrackingReport,
} from "../../services/trackingReportService";

import {
  downloadFleetAssignmentReport,
  getFleetAssignmentReport,
  type FleetAssignmentRow,
} from "../../services/reportService";

/**
 * Extracts the report array from common API response formats:
 * - [...]
 * - { reports: [...] }
 * - { data: [...] }
 * - { data: { reports: [...] } }
 * - { data: { data: [...] } }
 *
 * Returns null when the response does not contain a report array.
 */
function normalizeReports(
  response: unknown,
  depth = 0
): TrackingReport[] | null {
  if (Array.isArray(response)) {
    return response as TrackingReport[];
  }

  if (
    response === null ||
    typeof response !== "object" ||
    depth > 5
  ) {
    return null;
  }

  const result = response as Record<string, unknown>;

  for (const key of ["reports", "items", "results", "data"]) {
    if (key in result) {
      const normalized = normalizeReports(result[key], depth + 1);

      if (normalized !== null) {
        return normalized;
      }
    }
  }

  return null;
}

export default function DocumentsPage() {
  const [reports, setReports] = useState<TrackingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fleetRows, setFleetRows] = useState<FleetAssignmentRow[]>([]);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [fleetDownloading, setFleetDownloading] = useState(false);
  const [fleetOpen, setFleetOpen] = useState(false);

  async function handleViewFleetReport() {
    try {
      setFleetLoading(true);
      setError("");
      setSuccess("");
      setFleetRows(await getFleetAssignmentReport());
      setFleetOpen(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load the fleet report."));
    } finally {
      setFleetLoading(false);
    }
  }

  async function handleDownloadFleetReport() {
    try {
      setFleetDownloading(true);
      setError("");
      setSuccess("");

      const response = await downloadFleetAssignmentReport();
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `FLEET ASSIGNMENT REPORT ${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to download the fleet report."));
    } finally {
      setFleetDownloading(false);
    }
  }

  function getErrorMessage(err: unknown, fallback: string): string {
    const apiError = err as {
      response?: {
        data?: {
          message?: string;
        };
      };
      message?: string;
    };

    return (
      apiError?.response?.data?.message ||
      apiError?.message ||
      fallback
    );
  }

  async function loadReports(showLoader = true) {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const response: unknown = await listTrackingReports();
      const normalizedReports = normalizeReports(response);

      if (normalizedReports === null) {
        console.error(
          "Unexpected tracking reports API response:",
          response
        );

        throw new Error(
          "The tracking reports API returned an unexpected response. Please check the API response format."
        );
      }

      setReports(normalizedReports);
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, "Failed to load tracking reports.")
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadReports();
  }, []);

  async function handleGenerateReport() {
    try {
      setGenerating(true);
      setError("");
      setSuccess("");

      const result = await generateTrackingReport();

      setSuccess(
        `Impala Tracking Report #${result.report.report_number} generated successfully.`
      );

      await loadReports(false);
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          "Failed to generate the Impala Tracking Report."
        )
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(report: TrackingReport) {
    try {
      setDownloadingId(report.id);
      setError("");
      setSuccess("");

      const response = await downloadTrackingReport(report.id);

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = report.file_name;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          "Failed to download the tracking report."
        )
      );
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(report: TrackingReport) {
    const confirmed = window.confirm(
      `Delete Impala Tracking Report #${report.report_number} (${report.file_name})? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(report.id);
      setError("");
      setSuccess("");

      await deleteTrackingReport(report.id);

      setReports((current) =>
        current.filter((item) => item.id !== report.id)
      );

      setSuccess(
        `Impala Tracking Report #${report.report_number} deleted.`
      );
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          "Failed to delete the tracking report."
        )
      );
    } finally {
      setDeletingId(null);
    }
  }

  const thStyle: CSSProperties = {
    textAlign: "left",
    padding: "12px",
    borderBottom: "1px solid #ddd",
    whiteSpace: "nowrap",
  };

  const tdStyle: CSSProperties = {
    padding: "12px",
    borderBottom: "1px solid #eee",
    verticalAlign: "middle",
  };

  return (
    <div>
      <h1>Documents</h1>

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginTop: "16px",
          marginBottom: "8px",
        }}
      >
        <Link
          to="/company-admin/documents/drivers"
          className="button"
          style={{ textDecoration: "none" }}
        >
          Driver Documents
        </Link>

        <Link
          to="/company-admin/documents/trucks"
          className="button"
          style={{ textDecoration: "none" }}
        >
          Truck Documents
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginTop: "16px",
            padding: "12px",
            borderRadius: "6px",
            background: "#ffe5e5",
            color: "#b00020",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            marginTop: "16px",
            padding: "12px",
            borderRadius: "6px",
            background: "#e7f7e9",
            color: "#17652b",
          }}
        >
          {success}
        </div>
      )}

      <section style={{ marginTop: "24px" }}>
        <h2>Travel Documents</h2>

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "20px",
            marginTop: "12px",
          }}
        >
          <h3>Impala Tracking Reports</h3>

          <p>
            Generate a new Excel snapshot containing both Northbound and
            Southbound trip data and the journey-event log. Each generated
            report is saved in this company's report history.
          </p>

          <button
            type="button"
            className="button"
            onClick={handleGenerateReport}
            disabled={generating}
          >
            {generating
              ? "Generating Report..."
              : "Generate New Impala Report"}
          </button>
        </div>

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "20px",
            marginTop: "24px",
          }}
        >
          <h3>Fleet Assignment Report</h3>

          <p>
            Lists every truck with its linked trailer (type and model) and
            linked driver, including the driver's passport number, licence
            number and chemical certificate number. Links come from each
            truck's current trip, or its most recent trip if it is idle.
          </p>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="button"
              onClick={() => void handleViewFleetReport()}
              disabled={fleetLoading}
            >
              {fleetLoading
                ? "Loading..."
                : fleetOpen
                ? "Refresh Report"
                : "View Report"}
            </button>

            <button
              type="button"
              className="button button-secondary"
              onClick={() => void handleDownloadFleetReport()}
              disabled={fleetDownloading}
            >
              {fleetDownloading ? "Downloading..." : "Download Excel"}
            </button>
          </div>

          {fleetOpen && (
            fleetRows.length === 0 ? (
              <p style={{ marginTop: "16px" }}>No trucks registered yet.</p>
            ) : (
              <div
                style={{ width: "100%", overflowX: "auto", marginTop: "16px" }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "1300px",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={thStyle}>Truck</th>
                      <th style={thStyle}>Truck Type</th>
                      <th style={thStyle}>Capacity</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Trailer No.</th>
                      <th style={thStyle}>Trailer Type</th>
                      <th style={thStyle}>Trailer Model</th>
                      <th style={thStyle}>Driver</th>
                      <th style={thStyle}>Passport No.</th>
                      <th style={thStyle}>Licence No.</th>
                      <th style={thStyle}>Chemical Cert. No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fleetRows.map((row) => (
                      <tr key={row.truck_id}>
                        <td style={tdStyle}>
                          <strong>{row.plate_number}</strong>
                        </td>
                        <td style={tdStyle}>{row.truck_type || "-"}</td>
                        <td style={tdStyle}>{row.capacity || "-"}</td>
                        <td style={tdStyle}>
                          {row.truck_status.replace(/_/g, " ")}
                        </td>
                        <td style={tdStyle}>{row.trailer_number || "-"}</td>
                        <td style={tdStyle}>{row.trailer_type || "-"}</td>
                        <td style={tdStyle}>{row.trailer_model || "-"}</td>
                        <td style={tdStyle}>{row.driver_name || "-"}</td>
                        <td style={tdStyle}>{row.passport_number || "-"}</td>
                        <td style={tdStyle}>{row.license_number || "-"}</td>
                        <td style={tdStyle}>
                          {row.chemical_certificate_number || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        <div style={{ marginTop: "24px" }}>
          <h3>Report History</h3>

          {loading ? (
            <p>Loading reports...</p>
          ) : reports.length === 0 ? (
            <p>
              No Impala Tracking Reports have been generated yet. Select
              "Generate New Impala Report" to create one.
            </p>
          ) : (
            <div style={{ width: "100%", overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginTop: "12px",
                  minWidth: "850px",
                }}
              >
                <thead>
                  <tr>
                    <th style={thStyle}>Report</th>
                    <th style={thStyle}>File Name</th>
                    <th style={thStyle}>Generated</th>
                    <th style={thStyle}>Generated By</th>
                    <th style={thStyle}>Northbound</th>
                    <th style={thStyle}>Southbound</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {reports.map((report) => {
                    const isDownloading =
                      downloadingId === report.id;
                    const isDeleting = deletingId === report.id;

                    return (
                      <tr key={report.id}>
                        <td style={tdStyle}>
                          #{report.report_number}
                        </td>

                        <td style={tdStyle}>
                          {report.file_name}
                        </td>

                        <td style={tdStyle}>
                          {new Date(
                            report.generated_at
                          ).toLocaleString()}
                        </td>

                        <td style={tdStyle}>
                          {report.generated_by_name || "-"}
                        </td>

                        <td style={tdStyle}>
                          {report.northbound_count}
                        </td>

                        <td style={tdStyle}>
                          {report.southbound_count}
                        </td>

                        <td style={tdStyle}>
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              type="button"
                              className="button button-secondary"
                              onClick={() =>
                                void handleDownload(report)
                              }
                              disabled={
                                isDownloading || isDeleting
                              }
                            >
                              {isDownloading
                                ? "Downloading..."
                                : "Download Excel"}
                            </button>

                            <button
                              type="button"
                              className="button button-danger"
                              onClick={() =>
                                void handleDelete(report)
                              }
                              disabled={
                                isDeleting || isDownloading
                              }
                              style={{
                                background: "#b42318",
                                borderColor: "#b42318",
                                color: "#fff",
                              }}
                            >
                              {isDeleting
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section style={{ marginTop: "40px" }}>
        <h2>Driver Documents</h2>
        <p>Driver personal documents will be added here.</p>
      </section>
    </div>
  );
}
