import { useEffect, useState } from "react";
import type { ChangeEvent, CSSProperties, FormEvent } from "react";
import {
  createDriver,
  type Driver,
  listDrivers,
} from "../../services/driverService";

const initialForm = {
  full_name: "",
  phone_number: "",
  passport_number: "",
  license_number: "",
  license_expiry_date: "",
  chemical_certificate_number: "",
  chemical_certificate_expiry_date: "",
  chemical_certificate_image: "",
};

type FormState = typeof initialForm;

/**
 * Convert the image value returned by the API into a value that an <img>
 * element can display. The backend normally stores a complete data URL, but
 * this also handles a raw base64 string if one was saved without its prefix.
 */
function getImageSrc(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(trimmed)) {
    return trimmed;
  }

  // A regular URL can be used directly.
  if (/^(https?:\/\/|blob:|\/)/i.test(trimmed)) {
    return trimmed;
  }

  // Support raw base64 images returned by an API/database.
  if (trimmed.startsWith("/9j/")) return `data:image/jpeg;base64,${trimmed}`;
  if (trimmed.startsWith("iVBOR")) return `data:image/png;base64,${trimmed}`;
  if (trimmed.startsWith("UklGR")) return `data:image/webp;base64,${trimmed}`;

  return trimmed;
}

export default function DriverProfilesPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("Chemical certificate");

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
    void loadDrivers();
  }, []);

  function updateField(field: keyof FormState, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function handleCertificateImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Chemical certificate image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((previous) => ({
          ...previous,
          chemical_certificate_image: reader.result as string,
        }));
        setSelectedFileName(file.name);
      }
    };
    reader.onerror = () => {
      setError("Could not read the selected image. Please try again.");
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
        passport_number: form.passport_number.trim() || undefined,
        license_number: form.license_number.trim() || undefined,
        license_expiry_date: form.license_expiry_date || undefined,
        chemical_certificate_number:
          form.chemical_certificate_number.trim() || undefined,
        chemical_certificate_expiry_date:
          form.chemical_certificate_expiry_date || undefined,
        chemical_certificate_image:
          form.chemical_certificate_image || undefined,
      };

      await createDriver(payload);
      setForm(initialForm);
      setSelectedFileName("");
      setSuccess("Driver added successfully.");
      await loadDrivers();
    } catch (err) {
      console.error(err);
      setError(
        (err as any)?.response?.data?.message ||
          "Failed to create driver. Check whether the phone number already exists.",
      );
    } finally {
      setCreating(false);
    }
  }

  function removeCertificateImage() {
    setForm((previous) => ({
      ...previous,
      chemical_certificate_image: "",
    }));
    setSelectedFileName("");
  }

  function openPreview(value: string | null | undefined, title: string) {
    const src = getImageSrc(value);
    if (!src) {
      setError(
        "No certificate image is available. If this driver already has a certificate, check that the API returns chemical_certificate_image.",
      );
      return;
    }
    setError("");
    setPreviewTitle(title);
    setPreviewImage(src);
  }

  return (
    <div className="page">
      <h1>Driver Profiles</h1>
      <p>
        Add and manage drivers for this company. Driver phone numbers are used to
        validate SMS replies. Expiry reminders are generated for driver licences
        and chemical certificates due within 15 days.
      </p>

      <form
        className="card"
        onSubmit={handleSubmit}
        style={{ marginBottom: 24 }}
      >
        <h3>Add New Driver</h3>

        {error && (
          <p role="alert" style={{ color: "red", fontWeight: 600 }}>
            {error}
          </p>
        )}
        {success && (
          <p role="status" style={{ color: "green", fontWeight: 600 }}>
            {success}
          </p>
        )}

        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div>
            <label>Full Name</label>
            <input
              className="input"
              value={form.full_name}
              onChange={(event) => updateField("full_name", event.target.value)}
              placeholder="Example: Hamisi Juma"
              required
            />
          </div>

          <div>
            <label>Phone Number</label>
            <input
              className="input"
              value={form.phone_number}
              onChange={(event) =>
                updateField("phone_number", event.target.value)
              }
              placeholder="Example: +255712345678"
              required
            />
          </div>

          <div>
            <label>Passport Number (optional)</label>
            <input
              className="input"
              value={form.passport_number}
              onChange={(event) =>
                updateField("passport_number", event.target.value)
              }
              placeholder="Passport number"
            />
          </div>

          <div>
            <label>Driver Licence Number (optional)</label>
            <input
              className="input"
              value={form.license_number}
              onChange={(event) =>
                updateField("license_number", event.target.value)
              }
              placeholder="Licence number"
            />
          </div>

          <div>
            <label>Driver Licence Expiry</label>
            <input
              className="input"
              type="date"
              value={form.license_expiry_date}
              onChange={(event) =>
                updateField("license_expiry_date", event.target.value)
              }
            />
          </div>

          <div>
            <label>Chemical Certificate Number (optional)</label>
            <input
              className="input"
              value={form.chemical_certificate_number}
              onChange={(event) =>
                updateField("chemical_certificate_number", event.target.value)
              }
              placeholder="Certificate number"
            />
          </div>

          <div>
            <label>Chemical Certificate Expiry</label>
            <input
              className="input"
              type="date"
              value={form.chemical_certificate_expiry_date}
              onChange={(event) =>
                updateField(
                  "chemical_certificate_expiry_date",
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label>Chemical Certificate Image (JPG, PNG, WEBP; max 5 MB)</label>
            <input
              className="input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCertificateImage}
            />

            {selectedFileName && (
              <small style={{ display: "block", marginTop: 6 }}>
                Selected: {selectedFileName}
              </small>
            )}

            {form.chemical_certificate_image && (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="button"
                  onClick={() =>
                    openPreview(
                      form.chemical_certificate_image,
                      "Selected chemical certificate",
                    )
                  }
                >
                  Preview selected image
                </button>
                <button
                  type="button"
                  className="button"
                  style={{ marginLeft: 8 }}
                  onClick={removeCertificateImage}
                >
                  Remove image
                </button>
              </div>
            )}

            {form.chemical_certificate_image && (
              <div style={{ marginTop: 12 }}>
                <img
                  src={getImageSrc(form.chemical_certificate_image) ?? undefined}
                  alt="Selected chemical certificate thumbnail"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    width: 220,
                    maxHeight: 160,
                    objectFit: "contain",
                    border: "1px solid #d8dee8",
                    borderRadius: 6,
                    background: "#f8fafc",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    openPreview(
                      form.chemical_certificate_image,
                      "Selected chemical certificate",
                    )
                  }
                  onError={() =>
                    setError(
                      "The selected image could not be displayed. Please select the image again.",
                    )
                  }
                />
              </div>
            )}
          </div>
        </div>

        <p style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
          Notifications are generated for both document types when their expiry
          date is within the next 15 days.
        </p>

        <button className="button" type="submit" disabled={creating}>
          {creating ? "Adding..." : "Add Driver"}
        </button>
      </form>

      {loading ? (
        <div className="card">Loading drivers...</div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1100,
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Driver Name</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Passport</th>
                <th style={thStyle}>Licence Number</th>
                <th style={thStyle}>Licence Expiry</th>
                <th style={thStyle}>Chemical Certificate No.</th>
                <th style={thStyle}>Certificate Expiry</th>
                <th style={thStyle}>Certificate Image</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Availability</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.id}>
                  <td style={tdStyle}>{driver.full_name}</td>
                  <td style={tdStyle}>{driver.phone_number}</td>
                  <td style={tdStyle}>{driver.passport_number || "-"}</td>
                  <td style={tdStyle}>{driver.license_number || "-"}</td>
                  <td style={tdStyle}>{formatDate(driver.license_expiry_date)}</td>
                  <td style={tdStyle}>
                    {driver.chemical_certificate_number || "-"}
                  </td>
                  <td style={tdStyle}>
                    {formatDate(driver.chemical_certificate_expiry_date)}
                  </td>
                  <td style={tdStyle}>
                    {driver.chemical_certificate_image ? (
                      <button
                        type="button"
                        className="button"
                        onClick={() =>
                          openPreview(
                            driver.chemical_certificate_image,
                            `${driver.full_name} — chemical certificate`,
                          )
                        }
                      >
                        View certificate
                      </button>
                    ) : (
                      "-"
                    )}
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

          {drivers.length === 0 && <p>No drivers registered yet.</p>}
        </div>
      )}

      {previewImage && (
        <div
          role="presentation"
          onClick={() => setPreviewImage(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setPreviewImage(null);
          }}
          style={modalOverlayStyle}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={previewTitle}
            onClick={(event) => event.stopPropagation()}
            style={modalContentStyle}
          >
            <div style={modalHeaderStyle}>
              <strong>{previewTitle}</strong>
              <button
                type="button"
                className="button"
                onClick={() => setPreviewImage(null)}
              >
                Close
              </button>
            </div>
            <img
              src={previewImage}
              alt={previewTitle}
              style={modalImageStyle}
              onError={() => {
                setPreviewImage(null);
                setError(
                  "The saved certificate image could not be loaded. The API may not be returning valid image data; check chemical_certificate_image in the GET /api/drivers response.",
                );
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const datePart = value.slice(0, 10);
  const date = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(date.getTime()) ? datePart : date.toLocaleDateString();
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: 10,
  borderBottom: "1px solid #e5e9f2",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: 10,
  borderBottom: "1px solid #eef2f7",
  verticalAlign: "top",
};

const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(0, 0, 0, 0.82)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const modalContentStyle: CSSProperties = {
  background: "#fff",
  color: "#111827",
  width: "fit-content",
  maxWidth: "95vw",
  maxHeight: "95vh",
  overflow: "auto",
  padding: 16,
  borderRadius: 12,
  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
};

const modalHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 12,
};

const modalImageStyle: CSSProperties = {
  display: "block",
  maxWidth: "90vw",
  maxHeight: "78vh",
  width: "auto",
  height: "auto",
  objectFit: "contain",
  margin: "0 auto",
};
