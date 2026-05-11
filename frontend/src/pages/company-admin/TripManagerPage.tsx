import { useEffect, useState } from "react";
import { listTrucks, Truck } from "../../services/truckService";
import { listDrivers, Driver } from "../../services/driverService";
import {
  completeTrip,
  createTrip,
  listTrips,
  ManualTripStatus,
  Trip,
  updateTripStatus
} from "../../services/tripService";

export default function TripManagerPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    truck_id: "",
    driver_id: "",
    route_from: "",
    route_to: "",
    cargo_description: "",
    planned_start_at: "",
    expected_arrival_at: ""
  });

  async function loadData() {
    try {
      setLoading(true);

      const [tripData, truckData, driverData] = await Promise.all([
        listTrips(),
        listTrucks(),
        listDrivers()
      ]);

      setTrips(tripData);
      setTrucks(truckData);
      setDrivers(driverData);
    } catch (err) {
      console.error(err);
      setError("Failed to load trip data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");

    try {
      await createTrip({
        truck_id: form.truck_id,
        driver_id: form.driver_id,
        route_from: form.route_from,
        route_to: form.route_to,
        cargo_description: form.cargo_description || undefined,
        planned_start_at: form.planned_start_at || undefined,
        expected_arrival_at: form.expected_arrival_at || undefined
      });

      setForm({
        truck_id: "",
        driver_id: "",
        route_from: "",
        route_to: "",
        cargo_description: "",
        planned_start_at: "",
        expected_arrival_at: ""
      });

      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "Failed to create trip. Make sure the truck is available and the driver is active."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateTripStatus(
    tripId: string,
    status: ManualTripStatus
  ) {
    try {
      setError("");
      await updateTripStatus(tripId, status);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message || "Failed to update trip status."
      );
    }
  }

  async function handleCompleteTrip(tripId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to complete this trip? This will make the truck and driver available again."
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      await completeTrip(tripId);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message || "Failed to complete trip."
      );
    }
  }

  const availableTrucks = trucks.filter(
    (truck) => truck.status === "AVAILABLE"
  );

  const availableDrivers = drivers.filter(
    (driver) => driver.is_active && !driver.active_trip_id
  );

  return (
    <div className="page">
      <h1>Trip Manager</h1>
      <p>
        Create trips by assigning an available truck and an active driver. The
        system will generate a public trip code like SIM-0001, and the Company
        Admin can manually update the trip progress from this page.
      </p>

      <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <h3>Create New Trip</h3>

        {error && (
          <p style={{ color: "red", fontWeight: 600 }}>
            {error}
          </p>
        )}

        <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          <div>
            <label>Available Truck</label>
            <select
              className="input"
              value={form.truck_id}
              onChange={(e) => updateField("truck_id", e.target.value)}
              required
            >
              <option value="">Select truck</option>
              {availableTrucks.map((truck) => (
                <option key={truck.id} value={truck.id}>
                  {truck.plate_number} - {truck.truck_type || "Truck"} -{" "}
                  {truck.capacity || "N/A"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Active Driver</label>
            <select
              className="input"
              value={form.driver_id}
              onChange={(e) => updateField("driver_id", e.target.value)}
              required
            >
              <option value="">Select driver</option>
              {availableDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name} - {driver.phone_number}
                </option>
              ))}
            </select>

            {availableDrivers.length === 0 && (
              <small style={{ color: "red" }}>
                No available drivers. Drivers already assigned to active trips
                will not appear here.
              </small>
            )}
          </div>

          <div>
            <label>Route From</label>
            <input
              className="input"
              value={form.route_from}
              onChange={(e) => updateField("route_from", e.target.value)}
              placeholder="Dar es Salaam"
              required
            />
          </div>

          <div>
            <label>Route To</label>
            <input
              className="input"
              value={form.route_to}
              onChange={(e) => updateField("route_to", e.target.value)}
              placeholder="Arusha"
              required
            />
          </div>

          <div>
            <label>Planned Start</label>
            <input
              className="input"
              type="datetime-local"
              value={form.planned_start_at}
              onChange={(e) => updateField("planned_start_at", e.target.value)}
            />
          </div>

          <div>
            <label>Expected Arrival</label>
            <input
              className="input"
              type="datetime-local"
              value={form.expected_arrival_at}
              onChange={(e) =>
                updateField("expected_arrival_at", e.target.value)
              }
            />
          </div>
        </div>

        <br />

        <label>Cargo Description</label>
        <textarea
          className="input"
          value={form.cargo_description}
          onChange={(e) => updateField("cargo_description", e.target.value)}
          placeholder="Example: Cement bags, 30 tonnes"
          rows={3}
        />

        <br />
        <br />

        <button className="button" type="submit" disabled={creating}>
          {creating ? "Creating Trip..." : "Create Trip"}
        </button>
      </form>

      {loading ? (
        <div className="card">Loading trips...</div>
      ) : (
        <div className="card">
          <h3>Trips</h3>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Trip Code</th>
                <th style={thStyle}>Truck</th>
                <th style={thStyle}>Driver</th>
                <th style={thStyle}>Route</th>
                <th style={thStyle}>Cargo</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>

            <tbody>
              {trips.map((trip) => (
                <tr key={trip.id}>
                  <td style={tdStyle}>
                    <strong>{trip.public_trip_code}</strong>
                  </td>

                  <td style={tdStyle}>{trip.plate_number}</td>

                  <td style={tdStyle}>{trip.driver_name}</td>

                  <td style={tdStyle}>
                    {trip.route_from} → {trip.route_to}
                  </td>

                  <td style={tdStyle}>{trip.cargo_description || "-"}</td>

                  <td style={tdStyle}>
                    <TripStatusBadge status={trip.status} />
                  </td>

                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {getManualTripActions(trip.status).map((action) => (
                        <button
                          key={action.status}
                          className="button"
                          type="button"
                          onClick={() =>
                            handleUpdateTripStatus(trip.id, action.status)
                          }
                        >
                          {action.label}
                        </button>
                      ))}

                      {trip.status === "ARRIVED" && (
                        <button
                          className="button"
                          type="button"
                          onClick={() => handleCompleteTrip(trip.id)}
                        >
                          Complete Trip
                        </button>
                      )}

                      {trip.status === "COMPLETED" && "Completed"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {trips.length === 0 && (
            <p>No trips created yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function getManualTripActions(status: string) {
  if (status === "ASSIGNED") {
    return [
      { label: "Start Trip", status: "STARTED" as const },
      { label: "Delayed", status: "DELAYED" as const },
      { label: "Breakdown", status: "BREAKDOWN" as const }
    ];
  }

  if (status === "STARTED") {
    return [
      { label: "On Route", status: "ON_ROUTE" as const },
      { label: "Delayed", status: "DELAYED" as const },
      { label: "Breakdown", status: "BREAKDOWN" as const }
    ];
  }

  if (status === "ON_ROUTE") {
    return [
      { label: "Arrived", status: "ARRIVED" as const },
      { label: "Delayed", status: "DELAYED" as const },
      { label: "Breakdown", status: "BREAKDOWN" as const }
    ];
  }

  if (status === "DELAYED") {
    return [
      { label: "Back On Route", status: "ON_ROUTE" as const },
      { label: "Arrived", status: "ARRIVED" as const },
      { label: "Breakdown", status: "BREAKDOWN" as const }
    ];
  }

  if (status === "BREAKDOWN") {
    return [
      { label: "Back On Route", status: "ON_ROUTE" as const },
      { label: "Delayed", status: "DELAYED" as const }
    ];
  }

  return [];
}

function TripStatusBadge({ status }: { status: string }) {
  const background =
    status === "COMPLETED"
      ? "#dcfce7"
      : status === "DELAYED"
      ? "#fef3c7"
      : status === "BREAKDOWN"
      ? "#fee2e2"
      : status === "ARRIVED"
      ? "#e0f2fe"
      : "#e5e7eb";

  const color =
    status === "COMPLETED"
      ? "#166534"
      : status === "DELAYED"
      ? "#92400e"
      : status === "BREAKDOWN"
      ? "#991b1b"
      : status === "ARRIVED"
      ? "#075985"
      : "#374151";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: "999px",
        background,
        color,
        fontWeight: 700,
        fontSize: 12
      }}
    >
      {formatStatus(status)}
    </span>
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