import { useEffect, useState } from "react";
import {
  Company,
  listCompanies,
  updateCompanyPlan,
  updateCompanyStatus
} from "../../services/companyService";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCompanies() {
    try {
      setLoading(true);
      const data = await listCompanies();
      setCompanies(data);
    } catch (error) {
      console.error("Failed to load companies", error);
      setError("Failed to load customer companies.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  async function handlePlanChange(
    companyId: string,
    planName: "STANDARD" | "PREMIUM"
  ) {
    try {
      setError("");
      await updateCompanyPlan(companyId, planName);
      await loadCompanies();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message || "Failed to update company plan."
      );
    }
  }

  async function handleStatusChange(
    companyId: string,
    status: "ACTIVE" | "SUSPENDED" | "ARCHIVED"
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to change this company status to ${status}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      await updateCompanyStatus(companyId, status);
      await loadCompanies();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message || "Failed to update company status."
      );
    }
  }

  return (
    <div className="page">
      <h1>Customer Companies</h1>
      <p>
        Manage customer companies, subscription plans, and account status. Only
        the Super Admin can change a customer&apos;s plan.
      </p>

      {error && (
        <p style={{ color: "red", fontWeight: 600 }}>
          {error}
        </p>
      )}

      {loading ? (
        <div className="card">Loading companies...</div>
      ) : (
        <div className="card">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Company</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Plan</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Change Plan</th>
                <th style={thStyle}>Change Status</th>
              </tr>
            </thead>

            <tbody>
              {companies.map((company) => (
                <tr key={company.id}>
                  <td style={tdStyle}>
                    <strong>{company.company_name}</strong>
                  </td>
                  <td style={tdStyle}>{company.company_code}</td>
                  <td style={tdStyle}>{company.contact_email}</td>
                  <td style={tdStyle}>{company.phone || "-"}</td>
                  <td style={tdStyle}>
                    <PlanBadge plan={company.plan_name || "STANDARD"} />
                  </td>
                  <td style={tdStyle}>
                    <StatusBadge status={company.status} />
                  </td>
                  <td style={tdStyle}>
                    <select
                      className="input"
                      value={company.plan_name || "STANDARD"}
                      onChange={(e) =>
                        handlePlanChange(
                          company.id,
                          e.target.value as "STANDARD" | "PREMIUM"
                        )
                      }
                    >
                      <option value="STANDARD">Standard</option>
                      <option value="PREMIUM">Premium</option>
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <select
                      className="input"
                      value={company.status}
                      onChange={(e) =>
                        handleStatusChange(
                          company.id,
                          e.target.value as "ACTIVE" | "SUSPENDED" | "ARCHIVED"
                        )
                      }
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {companies.length === 0 && (
            <p>No customer companies created yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: "999px",
        background: plan === "PREMIUM" ? "#dcfce7" : "#e0f2fe",
        color: plan === "PREMIUM" ? "#166534" : "#075985",
        fontWeight: 700,
        fontSize: 12
      }}
    >
      {plan}
    </span>
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