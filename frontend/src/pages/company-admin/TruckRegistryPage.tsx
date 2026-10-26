
import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import {
  createTruck,
  listTrucks,
  updateTruckStatus,
} from "../../services/truckService";

import type {
  Truck,
  ManageableTruckStatus,
} from "../../services/truckService";

type TruckFilter =
  | "ALL"
  | "AVAILABLE"
  | "UNDER_MAINTENANCE"
  | "ACCIDENTED"
  | "ON_TRIP"
  | "INACTIVE";

interface TruckForm {
  plate_number: string;
  truck_type: string;
  capacity: string;
  status: ManageableTruckStatus;
}

const initialForm: TruckForm = {
  plate_number: "",
  truck_type: "",
  capacity: "",
  status: "AVAILABLE",
};

const statusOptions: {
  value: ManageableTruckStatus;
  label: string;
}[] = [
  { value: "AVAILABLE", label: "Available" },
  {
    value: "UNDER_MAINTENANCE",
    label: "Under Maintenance",
  },
  { value: "ACCIDENTED", label: "Accidented" },
  { value: "INACTIVE", label: "Inactive" },
];

const filterOptions: { value: TruckFilter; label: string }[] = [
  { value: "ALL", label: "All Trucks" },
  { value: "AVAILABLE", label: "Available" },
  {
    value: "UNDER_MAINTENANCE",
    label: "Under Maintenance",
  },
  { value: "ACCIDENTED", label: "Accidented" },
  { value: "ON_TRIP", label: "On Trip" },
  { value: "INACTIVE", label: "Inactive" },
];

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #e5e9f2",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #eef2f7",
  verticalAlign: "middle",
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  background: "var(--input-bg, #ffffff)",
  color: "var(--text-color, #111827)",
};

function formatStatus(status?: string | null): string {
  if (!status) return "Unknown";

  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getDisplayStatus(truck: Truck): string {
  // An active trip takes precedence over the stored truck status.
  if (truck.active_trip_id) {
    return "ON_TRIP";
  }

  return truck.status;
}

function getStatusStyle(status: string): CSSProperties {
  const base: CSSProperties = {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  };

  switch (status) {
    case "AVAILABLE":
      return {
        ...base,
        color: "#166534",
        background: "#dcfce7",
      };

    case "UNDER_MAINTENANCE":
      return {
        ...base,
        color: "#92400e",
        background: "#fef3c7",
      };

    case "ACCIDENTED":
      return {
        ...base,
        color: "#991b1b",
        background: "#fee2e2",
      };

    case "ON_TRIP":
    case "ON_ROUTE":
    case "STARTED":
    case "ASSIGNED":
      return {
        ...base,
        color: "#1d4ed8",
        background: "#dbeafe",
      };

    case "INACTIVE":
      return {
        ...base,
        color: "#4b5563",
        background: "#e5e7eb",
      };

    case "DELAYED":
      return {
        ...base,
        color: "#9a3412",
        background: "#ffedd5",
      };

    case "BREAKDOWN":
      return {
        ...base,
        color: "#9f1239",
        background: "#ffe4e6",
      };

    case "ARRIVED":
      return {
        ...base,
        color: "#166534",
        background: "#dcfce7",
      };

    default:
      return {
        ...base,
        color: "#374151",
        background: "#f3f4f6",
      };
  }
}

export default function TruckRegistryPage() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingTruckId, setUpdatingTruckId] = useState<string | null>(
    null
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState<TruckFilter>("ALL");
  const [form, setForm] = useState<TruckForm>(initialForm);

  async function loadTrucks() {
    try {
      setLoading(true);
      const data = await listTrucks();
      setTrucks(data);
      setError("");
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to load trucks. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTrucks();
  }, []);

  function updateField<K extends keyof TruckForm>(
    field: K,
    value: TruckForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function getErrorMessage(err: unknown, fallback: string): string {
    const apiError = err as {
      response?: {
        data?: {
          message?: string;
        };
      };
    };

    return apiError?.response?.data?.message || fallback;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setCreating(true);

    try {
      await createTruck({
        plate_number: form.plate_number.trim().toUpperCase(),
        truck_type: form.truck_type.trim(),
        capacity: form.capacity.trim(),
        status: form.status,
      });

      setForm({ ...initialForm });
      setSuccess("Truck registered successfully.");

      await loadTrucks();
    } catch (err: unknown) {
      console.error(err);
      setError(
        getErrorMessage(
          err,
          "Failed to create truck. Check the plate number and try again."
        )
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(
    truckId: string,
    status: ManageableTruckStatus
  ) {
    setError("");
    setSuccess("");
    setUpdatingTruckId(truckId);

    try {
      await updateTruckStatus(truckId, status);
      setSuccess("Truck status updated successfully.");
      await loadTrucks();
    } catch (err: unknown) {
      console.error(err);
      setError(
        getErrorMessage(err, "Failed to update truck status.")
      );
    } finally {
      setUpdatingTruckId(null);
    }
  }

  const filteredTrucks = trucks.filter((truck) => {
    if (filter === "ALL") return true;

    const displayStatus = getDisplayStatus(truck);

    if (filter === "ON_TRIP") {
      return Boolean(truck.active_trip_id);
    }

    return displayStatus === filter;
  });

  const counts: Record<TruckFilter, number> = {
    ALL: trucks.length,
    AVAILABLE: 0,
    UNDER_MAINTENANCE: 0,
    ACCIDENTED: 0,
    ON_TRIP: 0,
    INACTIVE: 0,
  };

  trucks.forEach((truck) => {
    const displayStatus = getDisplayStatus(truck);

    if (truck.active_trip_id) {
      counts.ON_TRIP += 1;
    } else if (
      displayStatus === "AVAILABLE" ||
      displayStatus === "UNDER_MAINTENANCE" ||
      displayStatus === "ACCIDENTED" ||
      displayStatus === "INACTIVE"
    ) {
      counts[displayStatus] += 1;
    }
  });

  return (
    <div className="page">
      <h1>Truck Registry</h1>

      <p>
        Register trucks, monitor their availability, and manage their
        operational status. Trucks assigned to active trips cannot have
        their status changed here.
      </p>

      {error && (
        <div
          role="alert"
          style={{
            padding: "12px 14px",
            marginBottom: "16px",
            borderRadius: "6px",
            color: "#991b1b",
            background: "#fee2e2",
            border: "1px solid #fecaca",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            padding: "12px 14px",
            marginBottom: "16px",
            borderRadius: "6px",
            color: "#166534",
            background: "#dcfce7",
            border: "1px solid #bbf7d0",
          }}
        >
          {success}
        </div>
      )}

      <form
        className="card"
        onSubmit={handleSubmit}
        style={{ marginBottom: 24 }}
      >
        <h3>Add New Truck</h3>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
          }}
        >
          <div>
            <label htmlFor="truck-plate">Plate Number</label>
            <input
              id="truck-plate"
              className="input"
              style={inputStyle}
              value={form.plate_number}
              onChange={(event) =>
                updateField(
                  "plate_number",
                  event.target.value.toUpperCase()
                )
              }
              placeholder="Example: T204 ABC"
              maxLength={30}
              required
            />
          </div>

          <div>
            <label htmlFor="truck-type">Truck Type</label>
            <input
              id="truck-type"
              className="input"
              style={inputStyle}
              value={form.truck_type}
              onChange={(event) =>
                updateField("truck_type", event.target.value)
              }
              placeholder="Example: Trailer"
            />
          </div>

          <div>
            <label htmlFor="truck-capacity">Capacity</label>
            <input
              id="truck-capacity"
              className="input"
              style={inputStyle}
              value={form.capacity}
              onChange={(event) =>
                updateField("capacity", event.target.value)
              }
              placeholder="Example: 30T"
            />
          </div>

          <div>
            <label htmlFor="truck-status">Initial Status</label>
            <select
              id="truck-status"
              className="input"
              style={inputStyle}
              value={form.status}
              onChange={(event) =>
                updateField(
                  "status",
                  event.target.value as ManageableTruckStatus
                )
              }
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          className="button"
          type="submit"
          disabled={creating}
          style={{ marginTop: "18px" }}
        >
          {creating ? "Adding Truck..." : "Add Truck"}
        </button>
      </form>

      <div className="card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <div>
            <h3 style={{ marginBottom: "6px" }}>Registered Trucks</h3>
            <p style={{ margin: 0 }}>
              Showing {filteredTrucks.length} of {trucks.length} trucks
            </p>
          </div>

          <div style={{ minWidth: "210px" }}>
            <label htmlFor="truck-filter">Filter by Status</label>
            <select
              id="truck-filter"
              className="input"
              style={inputStyle}
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as TruckFilter)
              }
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({counts[option.value]})
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p>Loading trucks...</p>
        ) : (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "760px",
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Plate Number</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Capacity</th>
                  <th style={thStyle}>Current Status</th>
                  <th style={thStyle}>Change Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredTrucks.map((truck) => {
                  const displayStatus = getDisplayStatus(truck);
                  const hasActiveTrip = Boolean(truck.active_trip_id);
                  const isUpdating = updatingTruckId === truck.id;

                  return (
                    <tr key={truck.id}>
                      <td style={tdStyle}>
                        <strong>{truck.plate_number}</strong>
                      </td>

                      <td style={tdStyle}>{truck.truck_type || "-"}</td>

                      <td style={tdStyle}>{truck.capacity || "-"}</td>

                      <td style={tdStyle}>
                        <span style={getStatusStyle(displayStatus)}>
                          {formatStatus(displayStatus)}
                        </span>

                        {hasActiveTrip && truck.active_trip_code && (
                          <div
                            style={{
                              fontSize: "12px",
                              marginTop: "6px",
                              opacity: 0.8,
                            }}
                          >
                            Trip: {truck.active_trip_code}
                          </div>
                        )}
                      </td>

                      <td style={tdStyle}>
                        {hasActiveTrip ? (
                          <div>
                            <span
                              style={{
                                ...getStatusStyle("ON_TRIP"),
                                marginBottom: "5px",
                              }}
                            >
                              Status Locked
                            </span>
                            <div style={{ fontSize: "12px" }}>
                              Cannot change while a trip is active.
                            </div>
                          </div>
                        ) : (
                          <select
                            className="input"
                            style={{
                              ...inputStyle,
                              minWidth: "175px",
                            }}
                            value={
                              statusOptions.some(
                                (option) => option.value === truck.status
                              )
                                ? truck.status
                                : ""
                            }
                            disabled={isUpdating}
                            onChange={(event) => {
                              const nextStatus = event.target.value;

                              if (
                                statusOptions.some(
                                  (option) => option.value === nextStatus
                                )
                              ) {
                                void handleStatusChange(
                                  truck.id,
                                  nextStatus as ManageableTruckStatus
                                );
                              }
                            }}
                          >
                            {!statusOptions.some(
                              (option) => option.value === truck.status
                            ) && (
                              <option value="" disabled>
                                {formatStatus(truck.status)}
                              </option>
                            )}

                            {statusOptions.map((option) => (
                              <option
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {isUpdating && (
                          <div style={{ fontSize: "12px", marginTop: "5px" }}>
                            Updating...
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredTrucks.length === 0 && (
              <p style={{ padding: "18px 0" }}>
                {trucks.length === 0
                  ? "No trucks registered yet."
                  : "No trucks match the selected filter."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
