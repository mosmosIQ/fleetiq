import { useState } from "react";
import { changePassword } from "../services/authService";

export default function ChangePasswordCard() {
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.new_password !== form.confirm_password) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (form.new_password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      await changePassword({
        current_password: form.current_password,
        new_password: form.new_password
      });

      setForm({
        current_password: "",
        new_password: "",
        confirm_password: ""
      });

      setSuccess("Password changed successfully.");
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message || "Failed to change password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
      <h2>Change Password</h2>
      <p>
        Update your account password. Use a strong password and avoid sharing it
        with other users.
      </p>

      {error && (
        <p style={{ color: "#dc2626", fontWeight: 700 }}>
          {error}
        </p>
      )}

      {success && (
        <p style={{ color: "#16a34a", fontWeight: 700 }}>
          {success}
        </p>
      )}

      <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div>
          <label>Current Password</label>
          <input
            className="input"
            type="password"
            value={form.current_password}
            onChange={(e) =>
              updateField("current_password", e.target.value)
            }
            required
          />
        </div>

        <div>
          <label>New Password</label>
          <input
            className="input"
            type="password"
            value={form.new_password}
            onChange={(e) =>
              updateField("new_password", e.target.value)
            }
            required
          />
        </div>

        <div>
          <label>Confirm New Password</label>
          <input
            className="input"
            type="password"
            value={form.confirm_password}
            onChange={(e) =>
              updateField("confirm_password", e.target.value)
            }
            required
          />
        </div>
      </div>

      <br />

      <button className="button" type="submit" disabled={loading}>
        {loading ? "Changing..." : "Change Password"}
      </button>
    </form>
  );
}