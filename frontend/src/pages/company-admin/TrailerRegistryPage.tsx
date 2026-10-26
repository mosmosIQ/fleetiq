
import { useEffect, useState } from "react";

import {
  createTrailer,
  listTrailers,
  updateTrailerStatus,
  Trailer
} from "../../services/trailerService";

export default function TrailerRegistryPage() {
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    trailer_number: "",
    trailer_type: "",
    status: "AVAILABLE"
  });

  async function loadTrailers() {
    try {
      setLoading(true);
      setError("");

      const data = await listTrailers();
      setTrailers(data);
    } catch (err: any) {
      console.error("Failed to load trailers:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to load trailers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTrailers();
  }, []);

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value
    }));
  }

  async function handleCreate(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.trailer_number.trim()) {
      setError("Trailer number is required.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      await createTrailer({
        trailer_number: form.trailer_number.trim(),
        trailer_type: form.trailer_type.trim() || undefined,
        status: form.status
      });

      setForm({
        trailer_number: "",
        trailer_type: "",
        status: "AVAILABLE"
      });

      await loadTrailers();
    } catch (err: any) {
      console.error("Failed to create trailer:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to create trailer."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(
    trailerId: string,
    status: string
  ) {
    try {
      setError("");

      await updateTrailerStatus(trailerId, status);

      await loadTrailers();
    } catch (err: any) {
      console.error("Failed to update trailer status:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to update trailer status."
      );
    }
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Trailer Registry</h1>

        <div className="card">
          Loading trailers...
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Trailer Registry</h1>

      <p>
        Manage your company's trailers and their availability.
      </p>

      {error && (
        <div
          className="card"
          role="alert"
          style={{
            marginBottom: 20,
            borderColor: "#dc2626",
            background: "#fef2f2",
            color: "#b91c1c"
          }}
        >
          {error}
        </div>
      )}

      {/* CREATE TRAILER */}

      <div
        className="card"
        style={{ marginBottom: 24 }}
      >
        <h2>Add Trailer</h2>

        <form onSubmit={handleCreate}>
          <div
            className="grid grid-3"
            style={{ marginBottom: 16 }}
          >
            <div className="form-group">
              <label htmlFor="trailer_number">
                Trailer Number
              </label>

              <input
                id="trailer_number"
                className="input"
                value={form.trailer_number}
                onChange={(event) =>
                  updateField(
                    "trailer_number",
                    event.target.value
                  )
                }
                placeholder="e.g. T 385ECS"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="trailer_type">
                Trailer Type
              </label>

              <input
                id="trailer_type"
                className="input"
                value={form.trailer_type}
                onChange={(event) =>
                  updateField(
                    "trailer_type",
                    event.target.value
                  )
                }
                placeholder="e.g. Flatbed"
              />
            </div>

            <div className="form-group">
              <label htmlFor="trailer_status">
                Initial Status
              </label>

              <select
                id="trailer_status"
                className="input"
                value={form.status}
                onChange={(event) =>
                  updateField(
                    "status",
                    event.target.value
                  )
                }
              >
                <option value="AVAILABLE">
                  Available
                </option>

                <option value="UNDER_MAINTENANCE">
                  Under Maintenance
                </option>

                <option value="INACTIVE">
                  Inactive
                </option>
              </select>
            </div>
          </div>

          <button
            className="button"
            type="submit"
            disabled={creating}
          >
            {creating ? "Adding..." : "Add Trailer"}
          </button>
        </form>
      </div>

      {/* TRAILER LIST */}

      <div className="card">
        <h2>Trailers</h2>

        {trailers.length === 0 ? (
          <p>No trailers registered yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse"
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>
                    Trailer Number
                  </th>

                  <th style={thStyle}>
                    Type
                  </th>

                  <th style={thStyle}>
                    Status
                  </th>

                  <th style={thStyle}>
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {trailers.map((trailer) => {
                  const assigned =
                    Boolean(
                      (trailer as Trailer & {
                        active_trip_id?: string | null;
                      }).active_trip_id
                    );

                  return (
                    <tr key={trailer.id}>
                      <td style={tdStyle}>
                        <strong>
                          {trailer.trailer_number}
                        </strong>
                      </td>

                      <td style={tdStyle}>
                        {trailer.trailer_type || "-"}
                      </td>

                      <td style={tdStyle}>
                        {formatStatus(trailer.status)}

                        {assigned && (
                          <div
                            style={{
                              fontSize: 12,
                              marginTop: 4,
                              color: "#6b7280"
                            }}
                          >
                            Assigned to active trip
                          </div>
                        )}
                      </td>

                      <td style={tdStyle}>
                        <select
                          className="input"
                          aria-label={`Change status for ${trailer.trailer_number}`}
                          value={trailer.status}
                          disabled={assigned}
                          onChange={(event) =>
                            handleStatusChange(
                              trailer.id,
                              event.target.value
                            )
                          }
                        >
                          <option value="AVAILABLE">
                            Available
                          </option>

                          <option value="UNDER_MAINTENANCE">
                            Under Maintenance
                          </option>

                          <option value="INACTIVE">
                            Inactive
                          </option>
                        </select>

                        {assigned && (
                          <div
                            style={{
                              fontSize: 12,
                              marginTop: 4,
                              color: "#b45309"
                            }}
                          >
                            Complete the trip before
                            changing trailer status.
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #e5e9f2"
};

const tdStyle: React.CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid #eef2f7"
};
