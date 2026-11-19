import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { Link } from "react-router-dom";

import {
  deleteTruckDocument,
  getTruckDocumentFile,
  listTruckDocuments,
  updateTruckInsurance,
  uploadTruckDocument,
} from "../../services/truckDocumentService";
import type { TruckWithDocuments } from "../../services/truckDocumentService";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALERT_DAYS = 7;

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

function expiryInfo(expiry: string) {
  if (!expiry) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${expiry}T00:00:00`);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) {
    return { text: `Expired ${Math.abs(days)} day(s) ago`, color: "var(--danger)", bg: "var(--danger-tint)" };
  }
  if (days === 0) {
    return { text: "Expires today", color: "var(--danger)", bg: "var(--danger-tint)" };
  }
  if (days <= ALERT_DAYS) {
    return { text: `Expires in ${days} day(s)`, color: "var(--warning)", bg: "var(--warning-tint)" };
  }
  return { text: `Valid — ${days} days left`, color: "var(--success)", bg: "var(--success-tint)" };
}

type Notify = (kind: "error" | "success", message: string) => void;

function TruckCard({
  truck,
  notify,
  onRefresh,
  onPreviewImage,
}: {
  truck: TruckWithDocuments;
  notify: Notify;
  onRefresh: () => Promise<void>;
  onPreviewImage: (src: string, title: string) => void;
}) {
  const [number, setNumber] = useState(truck.insurance_number || "");
  const [expiry, setExpiry] = useState(dateInput(truck.insurance_expiry_date));
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const doc = truck.documents.find((d) => d.document_type === "TRUCK_INSURANCE");
  const badge = expiryInfo(expiry);

  async function handleSave() {
    try {
      setSaving(true);
      await updateTruckInsurance(truck.id, {
        insurance_number: number.trim(),
        insurance_expiry_date: expiry,
      });
      notify("success", `${truck.plate_number}: insurance details saved.`);
      await onRefresh();
    } catch (err) {
      notify("error", apiMessage(err, "Failed to save insurance details."));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
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
      setBusy(true);
      const dataUrl = await readFile(file);
      await uploadTruckDocument(truck.id, "TRUCK_INSURANCE", {
        file_data: dataUrl,
        file_name: file.name,
      });
      notify("success", `${truck.plate_number}: insurance copy uploaded.`);
      await onRefresh();
    } catch (err) {
      notify("error", apiMessage(err, "Failed to upload the file."));
    } finally {
      setBusy(false);
    }
  }

  async function handleView(documentId: string) {
    try {
      setBusy(true);
      const file = await getTruckDocumentFile(documentId);

      if (file.file_url.startsWith("data:application/pdf")) {
        window.open(dataUrlToBlobUrl(file.file_url), "_blank", "noopener");
      } else {
        onPreviewImage(file.file_url, `${truck.plate_number} — Insurance`);
      }
    } catch (err) {
      notify("error", apiMessage(err, "Could not open the file."));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(documentId: string) {
    if (!window.confirm(`Delete ${truck.plate_number}'s insurance copy?`)) return;

    try {
      setBusy(true);
      await deleteTruckDocument(documentId);
      notify("success", "Insurance copy deleted.");
      await onRefresh();
    } catch (err) {
      notify("error", apiMessage(err, "Failed to delete the file."));
    } finally {
      setBusy(false);
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
          <h2 style={{ marginBottom: 4 }}>{truck.plate_number}</h2>
          <div style={{ opacity: 0.75 }}>{truck.truck_type || "Truck"}</div>
        </div>

        {badge && (
          <span
            style={{
              alignSelf: "flex-start",
              padding: "6px 12px",
              borderRadius: 999,
              fontWeight: 700,
              fontSize: 13,
              background: badge.bg,
              color: badge.color,
            }}
          >
            {badge.text}
          </span>
        )}
      </div>

      <div style={{ ...sectionStyle, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Insurance</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          <div className="form-group">
            <label>Insurance Number</label>
            <input
              className="input"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Expiry Date</label>
            <input
              className="input"
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          {doc ? (
            <div style={{ marginBottom: 8, fontSize: 13 }}>
              <strong>Insurance copy on record:</strong>{" "}
              {doc.file_name || "Uploaded file"}
              <div style={{ opacity: 0.7 }}>
                Uploaded {new Date(doc.created_at).toLocaleDateString()}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() => void handleView(doc.id)}
                >
                  View
                </button>
                <button
                  type="button"
                  className="button button-danger"
                  disabled={busy}
                  onClick={() => void handleDelete(doc.id)}
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
              No insurance copy uploaded yet.
            </div>
          )}

          <label style={{ fontSize: 13 }}>
            {doc ? "Replace insurance copy" : "Import insurance copy"} (JPG, PNG,
            WEBP or PDF, max 5 MB)
          </label>
          <input
            className="input"
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            disabled={busy}
            onChange={(e) => void handleUpload(e)}
          />
          {busy && <div style={{ fontSize: 12 }}>Working...</div>}
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            className="button"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving..." : "Save Insurance Details"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TruckDocumentsPage() {
  const [trucks, setTrucks] = useState<TruckWithDocuments[]>([]);
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
      setTrucks(await listTruckDocuments());
    } catch (err) {
      setError(apiMessage(err, "Failed to load truck documents."));
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
    if (!q) return trucks;
    return trucks.filter((t) =>
      [t.plate_number, t.truck_type, t.insurance_number]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [trucks, search]);

  return (
    <div className="page">
      <p style={{ marginBottom: 8 }}>
        <Link to="/company-admin/documents">← Back to Documents</Link>
      </p>
      <h1>Truck Documents</h1>
      <p>
        Record each truck's insurance number and expiry date and import a copy of
        the insurance. You are notified every day during the last {ALERT_DAYS}{" "}
        days before it expires.
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
        placeholder="Search trucks"
        aria-label="Search trucks"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p>Loading trucks...</p>
      ) : filtered.length === 0 ? (
        <p>
          {trucks.length === 0
            ? "No trucks registered yet."
            : "No trucks match your search."}
        </p>
      ) : (
        filtered.map((truck) => (
          <TruckCard
            key={truck.id}
            truck={truck}
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
