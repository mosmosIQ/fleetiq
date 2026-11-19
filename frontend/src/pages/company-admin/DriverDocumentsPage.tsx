import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { Link } from "react-router-dom";

import {
  deleteDriverDocument,
  getDriverDocumentFile,
  listDriverDocuments,
  uploadDriverDocument,
} from "../../services/driverDocumentService";
import type {
  DriverDocumentType,
  DriverWithDocuments,
} from "../../services/driverDocumentService";
import { updateDriver } from "../../services/driverService";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function apiMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data
      ?.message || fallback
  );
}

function dateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlobUrl(dataUrl: string): string {
  const [meta, base64] = dataUrl.split(",");
  const mime = /data:([^;]+);/.exec(meta)?.[1] || "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

type Notify = (kind: "error" | "success", message: string) => void;

interface SectionConfig {
  type: DriverDocumentType;
  title: string;
  numberLabel?: string;
  numberKey?: "passport_number" | "license_number" | "chemical_certificate_number";
  expiryKey?: "license_expiry_date" | "chemical_certificate_expiry_date";
}

const SECTIONS: SectionConfig[] = [
  {
    type: "PASSPORT",
    title: "Passport",
    numberLabel: "Passport No.",
    numberKey: "passport_number",
  },
  {
    type: "DRIVER_LICENSE",
    title: "Driving Licence",
    numberLabel: "Licence No.",
    numberKey: "license_number",
    expiryKey: "license_expiry_date",
  },
  {
    type: "CHEMICAL_CERTIFICATE",
    title: "Chemical Certificate",
    numberLabel: "Chemical Certificate No.",
    numberKey: "chemical_certificate_number",
    expiryKey: "chemical_certificate_expiry_date",
  },
  {
    type: "DRIVER_CERTIFICATE",
    title: "Driver's Certificate",
  },
];

function DriverCard({
  driver,
  notify,
  onRefresh,
  onPreviewImage,
}: {
  driver: DriverWithDocuments;
  notify: Notify;
  onRefresh: () => Promise<void>;
  onPreviewImage: (src: string, title: string) => void;
}) {
  const [form, setForm] = useState({
    passport_number: driver.passport_number || "",
    license_number: driver.license_number || "",
    license_expiry_date: dateInput(driver.license_expiry_date),
    chemical_certificate_number: driver.chemical_certificate_number || "",
    chemical_certificate_expiry_date: dateInput(
      driver.chemical_certificate_expiry_date
    ),
  });
  const [saving, setSaving] = useState(false);
  const [busyType, setBusyType] = useState<string | null>(null);

  async function handleSaveDetails() {
    try {
      setSaving(true);
      await updateDriver(driver.id, {
        passport_number: form.passport_number.trim(),
        license_number: form.license_number.trim(),
        license_expiry_date: form.license_expiry_date,
        chemical_certificate_number: form.chemical_certificate_number.trim(),
        chemical_certificate_expiry_date: form.chemical_certificate_expiry_date,
      });
      notify("success", `${driver.full_name}: details saved.`);
      await onRefresh();
    } catch (err) {
      notify("error", apiMessage(err, "Failed to save details."));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(
    type: DriverDocumentType,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      notify("error", "Upload a JPG, PNG or WEBP image, or a PDF file.");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      notify("error", "File must be 5 MB or smaller.");
      return;
    }

    try {
      setBusyType(type);
      const dataUrl = await readFile(file);
      await uploadDriverDocument(driver.id, type, {
        file_data: dataUrl,
        file_name: file.name,
      });
      notify("success", `${driver.full_name}: file uploaded.`);
      await onRefresh();
    } catch (err) {
      notify("error", apiMessage(err, "Failed to upload the file."));
    } finally {
      setBusyType(null);
    }
  }

  async function handleView(documentId: string, title: string) {
    try {
      setBusyType(documentId);
      const file = await getDriverDocumentFile(documentId);

      if (file.file_url.startsWith("data:application/pdf")) {
        window.open(dataUrlToBlobUrl(file.file_url), "_blank", "noopener");
      } else {
        onPreviewImage(file.file_url, `${driver.full_name} — ${title}`);
      }
    } catch (err) {
      notify("error", apiMessage(err, "Could not open the file."));
    } finally {
      setBusyType(null);
    }
  }

  async function handleDelete(documentId: string, title: string) {
    if (!window.confirm(`Delete ${driver.full_name}'s ${title} file?`)) return;

    try {
      setBusyType(documentId);
      await deleteDriverDocument(documentId);
      notify("success", `${title} file deleted.`);
      await onRefresh();
    } catch (err) {
      notify("error", apiMessage(err, "Failed to delete the file."));
    } finally {
      setBusyType(null);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ marginBottom: 4 }}>{driver.full_name}</h2>
          <div style={{ opacity: 0.75 }}>{driver.phone_number}</div>
        </div>
        <div>
          <button
            type="button"
            className="button"
            disabled={saving}
            onClick={() => void handleSaveDetails()}
          >
            {saving ? "Saving..." : "Save Numbers & Expiry Dates"}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginTop: 16,
        }}
      >
        {SECTIONS.map((section) => {
          const doc = driver.documents.find(
            (d) => d.document_type === section.type
          );
          const busy = busyType === section.type || (doc && busyType === doc.id);

          return (
            <div key={section.type} style={sectionStyle}>
              <h3 style={{ marginTop: 0 }}>{section.title}</h3>

              {section.numberKey && (
                <div className="form-group">
                  <label>{section.numberLabel}</label>
                  <input
                    className="input"
                    value={form[section.numberKey]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [section.numberKey as string]: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              {section.expiryKey && (
                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    className="input"
                    type="date"
                    value={form[section.expiryKey]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [section.expiryKey as string]: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              <div style={{ marginTop: 8 }}>
                {doc ? (
                  <div style={{ marginBottom: 8, fontSize: 13 }}>
                    <strong>File on record:</strong>{" "}
                    {doc.file_name || "Uploaded file"}
                    <div style={{ opacity: 0.7 }}>
                      Uploaded {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={Boolean(busy)}
                        onClick={() => void handleView(doc.id, section.title)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="button button-danger"
                        disabled={Boolean(busy)}
                        onClick={() => void handleDelete(doc.id, section.title)}
                        style={{
                          background: "#b42318",
                          borderColor: "#b42318",
                          color: "#fff",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 8, fontSize: 13, opacity: 0.7 }}>
                    No file uploaded yet.
                  </div>
                )}

                <label style={{ fontSize: 13 }}>
                  {doc ? "Replace file" : "Upload file"} (JPG, PNG, WEBP or PDF,
                  max 5 MB)
                </label>
                <input
                  className="input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  disabled={Boolean(busy)}
                  onChange={(e) => void handleUpload(section.type, e)}
                />
                {busy && <div style={{ fontSize: 12 }}>Working...</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DriverDocumentsPage() {
  const [drivers, setDrivers] = useState<DriverWithDocuments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<{ src: string; title: string } | null>(
    null
  );

  async function load(showLoader = true) {
    try {
      if (showLoader) setLoading(true);
      setDrivers(await listDriverDocuments());
    } catch (err) {
      setError(apiMessage(err, "Failed to load driver documents."));
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function notify(kind: "error" | "success", message: string) {
    setError(kind === "error" ? message : "");
    setSuccess(kind === "success" ? message : "");
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) =>
      [d.full_name, d.phone_number, d.passport_number, d.license_number]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [drivers, search]);

  return (
    <div className="page">
      <p style={{ marginBottom: 8 }}>
        <Link to="/company-admin/documents">← Back to Documents</Link>
      </p>
      <h1>Driver Documents</h1>
      <p>
        Record each driver's passport, licence and chemical certificate numbers
        and upload a copy of each document, including the driver's certificate. Add new drivers on the Fleet
        Registry page.
      </p>

      {error && (
        <div
          className="card"
          role="alert"
          style={{
            marginBottom: 16,
            borderColor: "var(--danger)",
            background: "var(--danger-tint)",
            color: "var(--danger)",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="card"
          role="status"
          style={{
            marginBottom: 16,
            borderColor: "#16a34a",
            background: "var(--success-tint)",
            color: "var(--success)",
          }}
        >
          {success}
        </div>
      )}

      <input
        className="input"
        style={{ maxWidth: 360, marginBottom: 20 }}
        placeholder="Search drivers"
        aria-label="Search drivers"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p>Loading drivers...</p>
      ) : filtered.length === 0 ? (
        <p>
          {drivers.length === 0
            ? "No drivers registered yet."
            : "No drivers match your search."}
        </p>
      ) : (
        filtered.map((driver) => (
          <DriverCard
            key={driver.id}
            driver={driver}
            notify={notify}
            onRefresh={() => load(false)}
            onPreviewImage={(src, title) => setPreview({ src, title })}
          />
        ))
      )}

      {preview && (
        <div
          role="presentation"
          onClick={() => setPreview(null)}
          style={overlayStyle}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={modalStyle}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 12,
              }}
            >
              <strong>{preview.title}</strong>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setPreview(null)}
              >
                Close
              </button>
            </div>
            <img
              src={preview.src}
              alt={preview.title}
              style={{
                display: "block",
                maxWidth: "90vw",
                maxHeight: "78vh",
                objectFit: "contain",
                margin: "0 auto",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const sectionStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: 16,
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(0,0,0,0.82)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const modalStyle: CSSProperties = {
  background: "#fff",
  color: "var(--ink)",
  maxWidth: "95vw",
  maxHeight: "95vh",
  overflow: "auto",
  padding: 16,
  borderRadius: 12,
};
