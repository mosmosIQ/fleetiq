import { useEffect, useState } from "react";
import { CompanyReport, getCompanyReport } from "../../services/reportService";
import StatCard from "../../components/StatCard";

export default function ReportsPage() {
  const [report, setReport] = useState<CompanyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReport() {
    try {
      setLoading(true);
      const data = await getCompanyReport();
      setReport(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  if (loading) {
    return (
      <div className="page">
        <h1>Reports</h1>
        <div className="card">Loading reports...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="page">
        <h1>Reports</h1>
        <p style={{ color: "red", fontWeight: 600 }}>
          {error || "Report not available."}
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Reports</h1>
      <p>
        Operational summary for this company. This helps the Company Admin see
        fleet performance without manually checking Excel sheets.
      </p>

      <h2>Fleet Overview</h2>
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
          title="Inactive Trucks"
          value={report.trucks.inactive_trucks}
        />
      </div>

      <h2>Driver Overview</h2>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard
          title="Total Drivers"
          value={report.drivers.total_drivers}
        />
        <StatCard
          title="Active Drivers"
          value={report.drivers.active_drivers}
        />
        <StatCard
          title="Available Drivers"
          value={report.drivers.available_drivers}
        />
        <StatCard
          title="Drivers On Trip"
          value={report.drivers.drivers_on_trip}
        />
      </div>

      <h2>Trip Overview</h2>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard
          title="Total Trips"
          value={report.trips.total_trips}
        />
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
          subtitle={`${report.trips.breakdown_trips} breakdowns`}
        />
      </div>

      <h2>Message Usage</h2>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard
          title={`SMS Sent (${report.month})`}
          value={report.messages.sms_sent}
        />
        <StatCard
          title={`WhatsApp Sent (${report.month})`}
          value={report.messages.whatsapp_sent}
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