import { useEffect, useState } from "react";
import ChangePasswordCard from "../../components/ChangePasswordCard";
import {
  getCurrentSubscription,
  SubscriptionSummary
} from "../../services/subscriptionService";
import {
  CompanyUser,
  createCompanyUser,
  deactivateCompanyUser,
  listCompanyUsers,
  reactivateCompanyUser
} from "../../services/userService";

export default function SettingsPage() {
  const [subscription, setSubscription] =
    useState<SubscriptionSummary | null>(null);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "Admin@12345"
  });

  async function loadSettings() {
    try {
      setLoading(true);

      const [subscriptionData, userData] = await Promise.all([
        getCurrentSubscription(),
        listCompanyUsers()
      ]);

      setSubscription(subscriptionData);
      setUsers(userData);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "Failed to load company settings."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  async function handleCreateUser(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");

    try {
      await createCompanyUser(form);

      setForm({
        full_name: "",
        email: "",
        password: "Admin@12345"
      });

      await loadSettings();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "Failed to create Company Admin user."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(userId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to deactivate this user?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      await deactivateCompanyUser(userId);
      await loadSettings();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "Failed to deactivate user."
      );
    }
  }

  async function handleReactivate(userId: string) {
    try {
      setError("");
      await reactivateCompanyUser(userId);
      await loadSettings();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "Failed to reactivate user."
      );
    }
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Company Settings</h1>
        <div className="card">Loading settings...</div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="page">
        <h1>Company Settings</h1>
        <p style={{ color: "red", fontWeight: 600 }}>
          Subscription not found.
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Company Settings</h1>
      <p>
        View subscription usage, update your password, and manage Company Admin
        users. Standard and Premium have the same features; only limits are
        different.
      </p>

      {error && (
        <p style={{ color: "red", fontWeight: 600 }}>
          {error}
        </p>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>Subscription</h2>

        <p>
          <strong>Plan:</strong> {subscription.plan_name}
        </p>

        <p>
          <strong>Status:</strong> {subscription.subscription_status}
        </p>

        <p>
          <strong>Current Period:</strong>{" "}
          {new Date(subscription.current_period_start).toLocaleDateString()} -{" "}
          {new Date(subscription.current_period_end).toLocaleDateString()}
        </p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>Usage Limits</h2>

        <UsageRow
          label="Trucks"
          used={subscription.usage.trucks}
          limit={subscription.limits.trucks}
        />

        <UsageRow
          label="Drivers"
          used={subscription.usage.drivers}
          limit={subscription.limits.drivers}
        />

        <UsageRow
          label="Company Admin Users"
          used={subscription.usage.company_admins}
          limit={subscription.limits.company_admins}
        />
      </div>

      <ChangePasswordCard />

      <form
        className="card"
        onSubmit={handleCreateUser}
        style={{ marginBottom: 24 }}
      >
        <h2>Add Company Admin User</h2>

        <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div>
            <label>Full Name</label>
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => updateField("full_name", e.target.value)}
              placeholder="Example: Office Manager"
              required
            />
          </div>

          <div>
            <label>Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="manager@company.com"
              required
            />
          </div>

          <div>
            <label>Temporary Password</label>
            <input
              className="input"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              required
            />
          </div>
        </div>

        <br />

        <button className="button" type="submit" disabled={creating}>
          {creating ? "Creating..." : "Add User"}
        </button>
      </form>

      <div className="card">
        <h2>Company Admin Users</h2>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={tdStyle}>{user.full_name}</td>
                <td style={tdStyle}>{user.email}</td>
                <td style={tdStyle}>
                  {user.is_active ? "Active" : "Inactive"}
                </td>
                <td style={tdStyle}>
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td style={tdStyle}>
                  {user.is_active ? (
                    <button
                      className="button"
                      type="button"
                      onClick={() => handleDeactivate(user.id)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      className="button"
                      type="button"
                      onClick={() => handleReactivate(user.id)}
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <p>No Company Admin users found.</p>
        )}
      </div>
    </div>
  );
}

function UsageRow({
  label,
  used,
  limit
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isFull = used >= limit;

  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6
        }}
      >
        <strong>{label}</strong>
        <span>
          {used} / {limit}
        </span>
      </div>

      <div
        style={{
          height: 10,
          background: "#e5e7eb",
          borderRadius: 999,
          overflow: "hidden"
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: isFull ? "#dc2626" : "#1f6feb"
          }}
        />
      </div>

      {isFull && (
        <small style={{ color: "#dc2626", fontWeight: 600 }}>
          Limit reached. Upgrade or request additional capacity.
        </small>
      )}
    </div>
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