import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCompany } from "../../services/companyService";

export default function AddCompanyPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    company_name: "",
    company_code: "",
    contact_email: "",
    phone: "",
    address: "",
    plan_name: "STANDARD" as "STANDARD" | "PREMIUM",
    admin_name: "",
    admin_email: "",
    admin_password: "Admin@12345"
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await createCompany(form);
      navigate("/super-admin/companies");
    } catch (err) {
      console.error(err);
      setError("Failed to create company. Check the details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>Add Customer Company</h1>

      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 700 }}>
        {error && (
          <p style={{ color: "red", fontWeight: 600 }}>
            {error}
          </p>
        )}

        <h3>Company Details</h3>

        <label>Company Name</label>
        <input
          className="input"
          value={form.company_name}
          onChange={(e) => updateField("company_name", e.target.value)}
          placeholder="Example: Simba Logistics"
          required
        />

        <br />
        <br />

        <label>Company Code</label>
        <input
          className="input"
          value={form.company_code}
          onChange={(e) => updateField("company_code", e.target.value.toUpperCase())}
          placeholder="Example: SIM"
          required
        />

        <small>
          This code will be used for public trip codes like SIM-0102.
        </small>

        <br />
        <br />

        <label>Contact Email</label>
        <input
          className="input"
          type="email"
          value={form.contact_email}
          onChange={(e) => updateField("contact_email", e.target.value)}
          placeholder="info@company.com"
          required
        />

        <br />
        <br />

        <label>Phone</label>
        <input
          className="input"
          value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          placeholder="+255..."
        />

        <br />
        <br />

        <label>Address</label>
        <input
          className="input"
          value={form.address}
          onChange={(e) => updateField("address", e.target.value)}
          placeholder="Dar es Salaam, Tanzania"
        />

        <br />
        <br />

        <label>Plan</label>
        <select
          className="input"
          value={form.plan_name}
          onChange={(e) => updateField("plan_name", e.target.value)}
        >
          <option value="STANDARD">Standard</option>
          <option value="PREMIUM">Premium</option>
        </select>

        <br />
        <br />

        <h3>First Company Admin</h3>

        <label>Admin Name</label>
        <input
          className="input"
          value={form.admin_name}
          onChange={(e) => updateField("admin_name", e.target.value)}
          placeholder="Example: Simba Admin"
          required
        />

        <br />
        <br />

        <label>Admin Email</label>
        <input
          className="input"
          type="email"
          value={form.admin_email}
          onChange={(e) => updateField("admin_email", e.target.value)}
          placeholder="admin@company.com"
          required
        />

        <br />
        <br />

        <label>Temporary Password</label>
        <input
          className="input"
          value={form.admin_password}
          onChange={(e) => updateField("admin_password", e.target.value)}
          required
        />

        <br />
        <br />

        <button className="button" type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Company"}
        </button>
      </form>
    </div>
  );
}