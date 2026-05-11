import { useEffect, useState } from "react";
import StatCard from "../../components/StatCard";
import { CompanyReport, getCompanyReport } from "../../services/reportService";

export default function DashboardPage() {
  const [report, setReport] = useState<CompanyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      const data = await getCompanyReport();
      setReport(data);
    } catch (err: any) {
      console.error(err);

      const message =
        err?.response?.data?.message ||
        "Failed to load dashboard data.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();

    const interval = window.setInterval(() => {
      loadDashboard();
    }, 15000);

    return () => window.clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="page">
        <h1>Company Dashboard</h1>
        <div className="card">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="page">
        <h1>Company Dashboard</h1>
        <p style={{ color: "red", fontWeight: 600 }}>
          {error || "Dashboard data not available."}
        </p>
      </div>
    );
  }

  const hasCriticalIssues =
    report.trips.delayed_trips > 0 || report.trips.breakdown_trips > 0;

  return (
    <div className="page">
      <h1>Company Dashboard</h1>
      <p>
        Live overview of fleet activity. This dashboard refreshes automatically
        every 15 seconds.
      </p>

      {hasCriticalIssues && (
        <div
          className="card"
          style={{
            marginBottom: 24,
            borderColor: "#f59e0b",
            background: "#fffbeb"
          }}
        >
          <h3 style={{ marginTop: 0 }}>Attention Required</h3>
          <p style={{ marginBottom: 0 }}>
            You currently have {report.trips.delayed_trips} delayed trip(s) and{" "}
            {report.trips.breakdown_trips} breakdown trip(s). Check the Status
            Board for details.
          </p>
        </div>
      )}

      <h2>Fleet Summary</h2>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard
          title="Total Trucks"
          value={report.trucks.total_trucks}
          subtitle={`${report.trucks.available_trucks} available`}
        />

        <StatCard
          title="Active Trucks"
          value={report.trucks.active_trucks}
          subtitle="Assigned or on trip"
        />

        <StatCard
          title="Under Maintenance"
          value={report.trucks.under_maintenance_trucks}
        />

        <StatCard
          title="Available Drivers"
          value={report.drivers.available_drivers}
          subtitle={`${report.drivers.drivers_on_trip} on trip`}
        />
      </div>

      <h2>Trip Summary</h2>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard
          title="Active Trips"
          value={report.trips.active_trips}
        />

        <StatCard
          title="Completed Trips"
          value={report.trips.completed_trips}
        />

        <StatCard
          title="Delayed Trips"
          value={report.trips.delayed_trips}
        />

        <StatCard
          title="Breakdowns"
          value={report.trips.breakdown_trips}
        />
      </div>

      <div className="card">
        <h2>Recent Trips</h2>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Trip Code</th>
              <th style={thStyle}>Truck</th>
              <th style={thStyle}>Driver</th>
              <th style={thStyle}>Route</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Created</th>
            </tr>
          </thead>

          <tbody>
            {report.recent_trips.map((trip) => (
              <tr key={trip.id}>
                <td style={tdStyle}>
                  <strong>{trip.public_trip_code}</strong>
                </td>
                <td style={tdStyle}>{trip.plate_number}</td>
                <td style={tdStyle}>{trip.driver_name}</td>
                <td style={tdStyle}>
                  {trip.route_from} → {trip.route_to}
                </td>
                <td style={tdStyle}>{formatStatus(trip.status)}</td>
                <td style={tdStyle}>
                  {new Date(trip.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {report.recent_trips.length === 0 && (
          <p>No recent trips found.</p>
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