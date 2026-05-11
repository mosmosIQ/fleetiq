import { useEffect, useState } from "react";
import ChangePasswordCard from "../../components/ChangePasswordCard";
import StatCard from "../../components/StatCard";
import {
  getSuperAdminOverview,
  SuperAdminOverview
} from "../../services/superAdminService";

export default function SuperAdminDashboard() {
  const [overview, setOverview] = useState<SuperAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOverview() {
    try {
      setLoading(true);
      const data = await getSuperAdminOverview();
      setOverview(data);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "Failed to load Super Admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  if (loading) {
    return (
      <div className="page">
        <h1>Super Admin Overview</h1>
        <div className="card">Loading overview...</div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="page">
        <h1>Super Admin Overview</h1>
        <p style={{ color: "red", fontWeight: 600 }}>
          {error || "Overview not available."}
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Super Admin Overview</h1>
      <p>
        SaaS owner dashboard showing customer companies, subscriptions, fleet
        usage, and operational issues across the whole FleetIQ platform.
      </p>

      <h2>Customer Companies</h2>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard
          title="Total Companies"
          value={overview.companies.total_companies}
        />

        <StatCard
          title="Active"
          value={overview.companies.active_companies}
        />

        <StatCard
          title="Suspended"
          value={overview.companies.suspended_companies}
        />

        <StatCard
          title="Archived"
          value={overview.companies.archived_companies}
        />
      </div>

      <h2>Subscription Plans</h2>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard
          title="Standard Customers"
          value={overview.plans.standard}
        />

        <StatCard
          title="Premium Customers"
          value={overview.plans.premium}
        />
      </div>

      <h2>Platform Fleet Usage</h2>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard
          title="Total Trucks"
          value={overview.fleet.total_trucks}
        />

        <StatCard
          title="Total Drivers"
          value={overview.fleet.total_drivers}
        />

        <StatCard
          title="Total Trips"
          value={overview.fleet.total_trips}
        />

        <StatCard
          title="Active Trips"
          value={overview.fleet.active_trips}
        />
      </div>

      <h2>Issues Across Platform</h2>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard
          title="Completed Trips"
          value={overview.fleet.completed_trips}
        />

        <StatCard
          title="Delayed Trips"
          value={overview.fleet.delayed_trips}
        />

        <StatCard
          title="Breakdowns"
          value={overview.fleet.breakdown_trips}
        />
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>Recent Customer Companies</h2>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Company</th>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Plan</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Created</th>
            </tr>
          </thead>

          <tbody>
            {overview.recent_companies.map((company) => (
              <tr key={company.id}>
                <td style={tdStyle}>
                  <strong>{company.company_name}</strong>
                </td>
                <td style={tdStyle}>{company.company_code}</td>
                <td style={tdStyle}>{company.contact_email}</td>
                <td style={tdStyle}>{company.phone || "-"}</td>
                <td style={tdStyle}>
                  {company.plan_name || "-"}
                </td>
                <td style={tdStyle}>
                  <StatusBadge status={company.status} />
                </td>
                <td style={tdStyle}>
                  {new Date(company.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {overview.recent_companies.length === 0 && (
          <p>No customer companies created yet.</p>
        )}
      </div>

      <ChangePasswordCard />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const background =
    status === "ACTIVE"
      ? "#dcfce7"
      : status === "SUSPENDED"
      ? "#fef3c7"
      : "#fee2e2";

  const color =
    status === "ACTIVE"
      ? "#166534"
      : status === "SUSPENDED"
      ? "#92400e"
      : "#991b1b";

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
      {status}
    </span>
  );
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