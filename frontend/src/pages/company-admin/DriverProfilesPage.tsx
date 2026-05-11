import { useEffect, useState } from "react";
import {
  createDriver,
  Driver,
  listDrivers
} from "../../services/driverService";

export default function DriverProfilesPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    license_number: "",
    license_expiry_date: ""
  });

  async function loadDrivers() {
    try {
      setLoading(true);
      const data = await listDrivers();
      setDrivers(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load drivers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDrivers();
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
      await createDriver(form);

      setForm({
        full_name: "",
        phone_number: "",
        license_number: "",
        license_expiry_date: ""
      });

      await loadDrivers();
    } catch (err) {
      console.error(err);
      const message =
  (err as any)?.response?.data?.message ||
  "Failed to create driver. Check if the phone number already exists.";

setError(message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page">
      <h1>Driver Profiles</h1>
      <p>
        Add and manage drivers for this company. The driver phone number is very
        important because SMS replies will be validated using this number.
      </p>

      <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <h3>Add New Driver</h3>

        {error && (
          <p style={{ color: "red", fontWeight: 600 }}>
            {error}
          </p>
        )}

        <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div>
            <label>Full Name</label>
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => updateField("full_name", e.target.value)}
              placeholder="Example: Hamisi Juma"
              required
            />
          </div>

          <div>
            <label>Phone Number</label>
            <input
              className="input"
              value={form.phone_number}
              onChange={(e) => updateField("phone_number", e.target.value)}
              placeholder="Example: +255712345678"
              required
            />
          </div>

          <div>
            <label>Licence Number</label>
            <input
              className="input"
              value={form.license_number}
              onChange={(e) => updateField("license_number", e.target.value)}
              placeholder="Example: DRV-001"
            />
          </div>

          <div>
            <label>Licence Expiry Date</label>
            <input
              className="input"
              type="date"
              value={form.license_expiry_date}
              onChange={(e) => updateField("license_expiry_date", e.target.value)}
            />
          </div>
        </div>

        <br />

        <button className="button" type="submit" disabled={creating}>
          {creating ? "Adding..." : "Add Driver"}
        </button>
      </form>

      {loading ? (
        <div className="card">Loading drivers...</div>
      ) : (
        <div className="card">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Driver Name</th>
                <th style={thStyle}>Phone Number</th>
                <th style={thStyle}>Licence Number</th>
                <th style={thStyle}>Licence Expiry</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Availability</th>
              </tr>
            </thead>

            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.id}>
                  <td style={tdStyle}>{driver.full_name}</td>
                  <td style={tdStyle}>{driver.phone_number}</td>
                  <td style={tdStyle}>{driver.license_number || "-"}</td>
                  <td style={tdStyle}>
                    {driver.license_expiry_date
                      ? new Date(driver.license_expiry_date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td style={tdStyle}>
                    {driver.is_active ? "Active" : "Inactive"}
                  </td>
                  <td style={tdStyle}>
  {driver.active_trip_id
    ? `On Trip (${driver.active_trip_code})`
    : "Available"}
</td>
                </tr>
              ))}
            </tbody>
          </table>

          {drivers.length === 0 && (
            <p>No drivers registered yet.</p>
          )}
        </div>
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