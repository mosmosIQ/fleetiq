import { useEffect, useState } from "react";
import { listTrips, Trip } from "../../services/tripService";

export default function StatusBoardPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStatusBoard() {
    try {
      setLoading(true);
      const data = await listTrips();
      setTrips(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load status board.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatusBoard();

    const interval = window.setInterval(() => {
      loadStatusBoard();
    }, 15000);

    return () => window.clearInterval(interval);
  }, []);

  const activeTrips = trips.filter((trip) => trip.status !== "COMPLETED");
  const completedTrips = trips.filter((trip) => trip.status === "COMPLETED");

  return (
    <div className="page">
      <h1>Status Board</h1>
      <p>Updates automatically every 15 seconds.</p>

      {error && (
        <p className="error">
          {error}
        </p>
      )}

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>Active Trips</p>
          <h2>{activeTrips.length}</h2>
        </div>

        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>Delayed</p>
          <h2>{trips.filter((trip) => trip.status === "DELAYED").length}</h2>
        </div>

        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>Breakdowns</p>
          <h2>{trips.filter((trip) => trip.status === "BREAKDOWN").length}</h2>
        </div>

        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>Completed</p>
          <h2>{completedTrips.length}</h2>
        </div>
      </div>

      {loading ? (
        <div className="card">Loading status board...</div>
      ) : (
        <div className="card">
          <h3>Live Trip Status</h3>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Trip Code</th>
                <th style={thStyle}>Truck</th>
                <th style={thStyle}>Driver</th>
                <th style={thStyle}>Route</th>
                <th style={thStyle}>Trip Status</th>
                <th style={thStyle}>Truck Status</th>
                <th style={thStyle}>Last Source</th>
                <th style={thStyle}>Last Update</th>
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
                  <td style={tdStyle}>
                    <StatusBadge status={trip.status} />
                  </td>
                  <td style={tdStyle}>
                    {formatStatus(trip.truck_status || "-")}
                  </td>
                  <td style={tdStyle}>
                    {trip.last_update_source || "SYSTEM"}
                  </td>
                  <td style={tdStyle}>
                    {trip.last_update_at
                      ? new Date(trip.last_update_at).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {trips.length === 0 && (
            <p>No trips found yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const background =
    status === "DELAYED"
      ? "var(--warning-tint)"
      : status === "BREAKDOWN"
      ? "var(--danger-tint)"
      : status === "COMPLETED"
      ? "var(--success-tint)"
      : status === "ARRIVED"
      ? "var(--info-tint)"
      : "#e5e7eb";

  const color =
    status === "DELAYED"
      ? "var(--warning)"
      : status === "BREAKDOWN"
      ? "var(--danger)"
      : status === "COMPLETED"
      ? "var(--success)"
      : status === "ARRIVED"
      ? "var(--info)"
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
  borderBottom: "1px solid var(--line)"
};

const tdStyle: React.CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid var(--line)"
};