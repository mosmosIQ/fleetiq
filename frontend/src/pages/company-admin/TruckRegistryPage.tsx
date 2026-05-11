import { useEffect, useState } from "react";
import {
  createTruck,
  listTrucks,
  Truck,
  updateTruckStatus
} from "../../services/truckService";

export default function TruckRegistryPage() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    plate_number: "",
    truck_type: "",
    capacity: "",
    status: "AVAILABLE"
  });

  async function loadTrucks() {
    try {
      setLoading(true);
      const data = await listTrucks();
      setTrucks(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load trucks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrucks();
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
      await createTruck(form);

      setForm({
        plate_number: "",
        truck_type: "",
        capacity: "",
        status: "AVAILABLE"
      });

      await loadTrucks();
    } catch (err) {
      console.error(err);
     const message =
  (err as any)?.response?.data?.message ||
  "Failed to create truck. Check if the plate number already exists.";

setError(message);
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(truckId: string, status: string) {
  try {
    setError("");
    await updateTruckStatus(truckId, status);
    await loadTrucks();
  } catch (err: any) {
    console.error(err);

    const message =
      err?.response?.data?.message ||
      "Failed to update truck status.";

    setError(message);
  }
}

  return (
    <div className="page">
      <h1>Truck Registry</h1>
      <p>
        Add trucks and update their availability. For example, a truck can move
        from Under Maintenance back to Available once repairs are finished.
      </p>

      <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <h3>Add New Truck</h3>

        {error && (
          <p style={{ color: "red", fontWeight: 600 }}>
            {error}
          </p>
        )}

        <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div>
            <label>Plate Number</label>
            <input
              className="input"
              value={form.plate_number}
              onChange={(e) =>
                updateField("plate_number", e.target.value.toUpperCase())
              }
              placeholder="Example: T204 ABC"
              required
            />
          </div>

          <div>
            <label>Truck Type</label>
            <input
              className="input"
              value={form.truck_type}
              onChange={(e) => updateField("truck_type", e.target.value)}
              placeholder="Example: Trailer"
            />
          </div>

          <div>
            <label>Capacity</label>
            <input
              className="input"
              value={form.capacity}
              onChange={(e) => updateField("capacity", e.target.value)}
              placeholder="Example: 30T"
            />
          </div>

          <div>
            <label>Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
            >
              <option value="AVAILABLE">Available</option>
              <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <br />

        <button className="button" type="submit" disabled={creating}>
          {creating ? "Adding..." : "Add Truck"}
        </button>
      </form>

      {loading ? (
        <div className="card">Loading trucks...</div>
      ) : (
        <div className="card">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
              {trucks.map((truck) => (
                <tr key={truck.id}>
                  <td style={tdStyle}>{truck.plate_number}</td>
                  <td style={tdStyle}>{truck.truck_type || "-"}</td>
                  <td style={tdStyle}>{truck.capacity || "-"}</td>
                  <td style={tdStyle}>{formatStatus(truck.status)}</td>
                 <td style={tdStyle}>
  {truck.active_trip_id ? (
    <div>
      <strong>Locked</strong>
      <br />
      <small>
        Active trip: {truck.active_trip_code}
      </small>
    </div>
  ) : (
    <select
      className="input"
      value={truck.status}
      onChange={(e) =>
        handleStatusChange(truck.id, e.target.value)
      }
    >
      <option value="AVAILABLE">Available</option>
      <option value="UNDER_MAINTENANCE">Under Maintenance</option>
      <option value="INACTIVE">Inactive</option>
    </select>
  )}
</td>
                </tr>
              ))}
            </tbody>
          </table>

          {trucks.length === 0 && (
            <p>No trucks registered yet.</p>
          )}
        </div>
      )}
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