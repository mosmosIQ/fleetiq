import { useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import type { JourneyEvent, JourneyEventType, Trip } from "../../services/tripService";

export interface JourneyFormState {
  checkpoint: string;
  custom_checkpoint: string;
  event_type: JourneyEventType;
  location: string;
  occurred_at: string;
  notes: string;
  latitude: string;
  longitude: string;
}

interface JourneyTrackerProps {
  trip: Trip;
  events: JourneyEvent[];
  loading: boolean;
  saving: boolean;
  form: JourneyFormState;
  onFormChange: (next: JourneyFormState) => void;
  checkpoints: string[];
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
  statusClass: (status: string) => string;
}

// ------------------------------------------------------------
// event styling
// ------------------------------------------------------------

const EVENT_META: Record<
  JourneyEventType,
  { label: string; color: string; bg: string }
> = {
  ARRIVAL: { label: "Arrival", color: "#1d4ed8", bg: "#dbeafe" },
  DEPARTURE: { label: "Departure", color: "#4338ca", bg: "#e0e7ff" },
  LOADING: { label: "Loading", color: "var(--warning)", bg: "var(--warning-tint)" },
  HANDOVER: { label: "Handover", color: "#7e22ce", bg: "#f3e8ff" },
  RELEASE: { label: "Release", color: "#0f766e", bg: "#ccfbf1" },
  FINAL_ARRIVAL: { label: "Final Arrival", color: "var(--success)", bg: "var(--success-tint)" },
  FINAL_OFFLOADING: {
    label: "Final Offloading",
    color: "#14532d",
    bg: "#bbf7d0",
  },
};

const CHECKPOINT_EVENTS: JourneyEventType[] = [
  "ARRIVAL",
  "DEPARTURE",
  "LOADING",
  "HANDOVER",
  "RELEASE",
];

const FINAL_EVENTS: JourneyEventType[] = ["FINAL_ARRIVAL", "FINAL_OFFLOADING"];

function isFinal(type: JourneyEventType) {
  return FINAL_EVENTS.includes(type);
}

function norm(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nowLocalInput() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

type StopState = "pending" | "in_progress" | "arrived" | "departed";

const STATE_META: Record<StopState, { label: string; color: string; bg: string }> = {
  pending: { label: "Not reached", color: "var(--muted)", bg: "#f1f5f9" },
  in_progress: { label: "In progress", color: "var(--warning)", bg: "var(--warning-tint)" },
  arrived: { label: "Arrived", color: "#1d4ed8", bg: "#dbeafe" },
  departed: { label: "Departed", color: "var(--success)", bg: "var(--success-tint)" },
};

// ------------------------------------------------------------
// component
// ------------------------------------------------------------

export default function JourneyTracker({
  trip,
  events,
  loading,
  saving,
  form,
  onFormChange,
  checkpoints,
  onSubmit,
  onClose,
  statusClass,
}: JourneyTrackerProps) {
  const [showGps, setShowGps] = useState(false);

  const finalEvent = isFinal(form.event_type);

  const latest = events.length > 0 ? events[events.length - 1] : null;
  const timeline = useMemo(() => [...events].reverse(), [events]);

  const stops = useMemo(
    () =>
      checkpoints.map((name) => {
        const related = events.filter((e) => norm(e.checkpoint) === norm(name));
        let state: StopState = "pending";

        if (related.some((e) => e.event_type === "DEPARTURE")) state = "departed";
        else if (related.some((e) => e.event_type === "ARRIVAL")) state = "arrived";
        else if (related.length > 0) state = "in_progress";

        const last = related.length ? related[related.length - 1] : null;

        return { name, state, lastAt: last?.occurred_at || null };
      }),
    [checkpoints, events]
  );

  const destinationState = events.some((e) => e.event_type === "FINAL_OFFLOADING")
    ? "Offloaded"
    : events.some((e) => e.event_type === "FINAL_ARRIVAL")
    ? "Arrived"
    : "Pending";

  const reachedCount = stops.filter(
    (s) => s.state === "arrived" || s.state === "departed"
  ).length;

  function update(patch: Partial<JourneyFormState>) {
    onFormChange({ ...form, ...patch });
  }

  const summary = finalEvent
    ? `${EVENT_META[form.event_type].label}${form.checkpoint ? ` at ${form.checkpoint}` : ""}`
    : form.checkpoint
    ? `${EVENT_META[form.event_type].label} at ${form.checkpoint}`
    : "Select a checkpoint to continue";

  return (
    <section style={panel}>
      <style>{CSS}</style>

      {/* ---------------- header ---------------- */}
      <div style={headerRow}>
        <div>
          <div style={eyebrow}>Journey Tracking</div>
          <h2 style={{ margin: "2px 0 0", fontSize: 24 }}>
            {trip.public_trip_code}
          </h2>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className={`status-badge ${statusClass(trip.status)}`}>
            {trip.status}
          </span>
          <button type="button" className="button button-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* ---------------- summary ---------------- */}
      <div className="jt-summary">
        <SummaryItem label="Route" value={`${trip.route_from} → ${trip.route_to}`} />
        <SummaryItem label="Truck" value={trip.plate_number} />
        <SummaryItem label="Trailer" value={trip.trailer_number || "-"} />
        <SummaryItem label="Driver" value={trip.driver_name} />
        <SummaryItem
          label="Batch"
          value={
            trip.batch_number
              ? `Batch ${trip.batch_number}${
                  trip.batch_direction ? ` · ${trip.batch_direction}` : ""
                }`
              : "-"
          }
        />
      </div>

      {/* ---------------- current location ---------------- */}
      <div style={currentBox}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, color: "var(--muted)" }}>
          CURRENT LOCATION
        </div>
        {latest ? (
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {latest.location || latest.checkpoint || "In transit"}
              </div>
              <div style={{ color: "var(--muted)", marginTop: 2 }}>
                {formatDateTime(latest.occurred_at)}
              </div>
            </div>
            <div>
              <EventBadge type={latest.event_type} />
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 6, color: "var(--muted)" }}>
            No journey events recorded yet.
          </div>
        )}
      </div>

      {/* ---------------- route progress ---------------- */}
      <div style={block}>
        <div style={blockHeader}>
          <h3 style={blockTitle}>Route Progress</h3>
          {stops.length > 0 && (
            <span style={{ color: "var(--muted)", fontSize: 13 }}>
              {reachedCount} of {stops.length} checkpoints reached
            </span>
          )}
        </div>

        <div className="jt-route">
          <div className="jt-stop jt-stop-end">
            <span className="jt-dot jt-dot-done" />
            <div className="jt-stop-name">{trip.route_from}</div>
            <div className="jt-stop-state">Origin</div>
          </div>

          {stops.map((stop) => {
            const meta = STATE_META[stop.state];
            const selected = form.checkpoint === stop.name;

            return (
              <button
                key={stop.name}
                type="button"
                className={`jt-stop jt-stop-btn${selected ? " jt-selected" : ""}`}
                onClick={() => update({ checkpoint: stop.name, custom_checkpoint: "" })}
                title="Click to record an update for this checkpoint"
              >
                <span
                  className="jt-dot"
                  style={{ background: meta.color, borderColor: meta.color }}
                />
                <div className="jt-stop-name">{stop.name}</div>
                <div
                  className="jt-stop-state"
                  style={{ color: meta.color, background: meta.bg }}
                >
                  {meta.label}
                </div>
              </button>
            );
          })}

          <div className="jt-stop jt-stop-end">
            <span
              className="jt-dot"
              style={
                destinationState === "Pending"
                  ? undefined
                  : { background: "#16a34a", borderColor: "#16a34a" }
              }
            />
            <div className="jt-stop-name">{trip.route_to}</div>
            <div className="jt-stop-state">{destinationState === "Pending" ? "Destination" : destinationState}</div>
          </div>
        </div>

        {stops.length === 0 && (
          <div style={warn}>
            This trip has no saved route checkpoints. Assign a route template
            with checkpoints to this trip's batch.
          </div>
        )}
      </div>

      {/* ---------------- record update ---------------- */}
      <form onSubmit={onSubmit} style={block}>
        <div style={blockHeader}>
          <h3 style={blockTitle}>Record Update</h3>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            Select a checkpoint and what happened there.
          </span>
        </div>

        {/* step 1 */}
        <div style={step}>
          <div style={stepLabel}>
            <span style={stepNo}>1</span>
            Checkpoint {finalEvent && <em style={{ fontWeight: 400 }}>(optional for final events)</em>}
          </div>

          {stops.length > 0 ? (
            <div className="jt-chips">
              {stops.map((stop) => (
                <button
                  key={stop.name}
                  type="button"
                  className={`jt-chip${form.checkpoint === stop.name ? " jt-chip-on" : ""}`}
                  onClick={() =>
                    update({
                      checkpoint: form.checkpoint === stop.name ? "" : stop.name,
                      custom_checkpoint: "",
                    })
                  }
                >
                  {stop.name}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 14 }}>No checkpoints available.</div>
          )}
        </div>

        {/* step 2 */}
        <div style={step}>
          <div style={stepLabel}>
            <span style={stepNo}>2</span>
            What happened?
          </div>

          <div style={groupLabel}>At a checkpoint</div>
          <div className="jt-chips">
            {CHECKPOINT_EVENTS.map((type) => (
              <button
                key={type}
                type="button"
                className={`jt-chip${form.event_type === type ? " jt-chip-on" : ""}`}
                onClick={() => update({ event_type: type })}
              >
                {EVENT_META[type].label}
              </button>
            ))}
          </div>

          <div style={{ ...groupLabel, marginTop: 12 }}>End of trip</div>
          <div className="jt-chips">
            {FINAL_EVENTS.map((type) => (
              <button
                key={type}
                type="button"
                className={`jt-chip${form.event_type === type ? " jt-chip-on" : ""}`}
                onClick={() => update({ event_type: type })}
              >
                {EVENT_META[type].label}
              </button>
            ))}
          </div>
        </div>

        {/* step 3 */}
        <div style={step}>
          <div style={stepLabel}>
            <span style={stepNo}>3</span>
            Details <em style={{ fontWeight: 400 }}>(optional)</em>
          </div>

          <div className="jt-fields">
            <div>
              <label style={fieldLabel}>Date &amp; Time</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="input"
                  type="datetime-local"
                  value={form.occurred_at}
                  onChange={(e) => update({ occurred_at: e.target.value })}
                />
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => update({ occurred_at: nowLocalInput() })}
                >
                  Now
                </button>
              </div>
              <small style={hint}>Leave blank to use the current time.</small>
            </div>

            <div>
              <label style={fieldLabel}>Location</label>
              <input
                className="input"
                type="text"
                value={form.location}
                onChange={(e) => update({ location: e.target.value })}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={fieldLabel}>Notes</label>
              <textarea
                className="input"
                rows={2}
                value={form.notes}
                onChange={(e) => update({ notes: e.target.value })}
              />
            </div>
          </div>

          <button
            type="button"
            style={linkButton}
            onClick={() => setShowGps((v) => !v)}
          >
            {showGps ? "− Hide GPS coordinates" : "+ Add GPS coordinates"}
          </button>

          {showGps && (
            <div className="jt-fields" style={{ marginTop: 8 }}>
              <div>
                <label style={fieldLabel}>Latitude</label>
                <input
                  className="input"
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => update({ latitude: e.target.value })}
                />
              </div>
              <div>
                <label style={fieldLabel}>Longitude</label>
                <input
                  className="input"
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => update({ longitude: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        {/* submit */}
        <div style={submitRow}>
          <div style={{ fontWeight: 600 }}>{summary}</div>
          <button type="submit" className="button" disabled={saving}>
            {saving ? "Saving..." : "Record Update"}
          </button>
        </div>
      </form>

      {/* ---------------- history ---------------- */}
      <div style={block}>
        <div style={blockHeader}>
          <h3 style={blockTitle}>Journey History</h3>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            {events.length} update{events.length === 1 ? "" : "s"} · newest first
          </span>
        </div>

        {loading ? (
          <p>Loading journey history...</p>
        ) : timeline.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No journey events recorded yet.</p>
        ) : (
          <ol className="jt-timeline">
            {timeline.map((item) => {
              const meta = EVENT_META[item.event_type];

              return (
                <li key={item.id} className="jt-item">
                  <span className="jt-pin" style={{ background: meta.color }} />

                  <div className="jt-card">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>
                        {item.checkpoint || (isFinal(item.event_type) ? "Destination" : "-")}
                      </div>
                      <EventBadge type={item.event_type} />
                    </div>

                    <div style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>
                      {formatDateTime(item.occurred_at)}
                    </div>

                    {(item.location || item.notes) && (
                      <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
                        {item.location && (
                          <div>
                            <span style={{ color: "var(--muted)" }}>Location: </span>
                            {item.location}
                          </div>
                        )}
                        {item.notes && (
                          <div>
                            <span style={{ color: "var(--muted)" }}>Notes: </span>
                            {item.notes}
                          </div>
                        )}
                      </div>
                    )}

                    {item.source && (
                      <div style={{ marginTop: 6, fontSize: 12, color: "#94a3b8" }}>
                        Recorded via {item.source.replace(/_/g, " ").toLowerCase()}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------
// small pieces
// ------------------------------------------------------------

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function EventBadge({ type }: { type: JourneyEventType }) {
  const meta = EVENT_META[type];

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: meta.color,
        background: meta.bg,
        whiteSpace: "nowrap",
      }}
    >
      {meta.label}
    </span>
  );
}

// ------------------------------------------------------------
// styles
// ------------------------------------------------------------

const panel: CSSProperties = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: 14,
  padding: 24,
  marginTop: 20,
  boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
};

const headerRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 12,
  marginBottom: 16,
};

const eyebrow: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.8,
  color: "var(--brand)",
  textTransform: "uppercase",
};

const currentBox: CSSProperties = {
  background: "var(--soft)",
  border: "1px solid var(--line)",
  borderLeft: "4px solid var(--brand)",
  borderRadius: 10,
  padding: 16,
  marginTop: 16,
};

const block: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: 20,
  marginTop: 20,
  display: "block",
};

const blockHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 16,
};

const blockTitle: CSSProperties = { margin: 0, fontSize: 18 };

const warn: CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 8,
  background: "var(--warning-tint)",
  color: "var(--warning)",
  fontSize: 14,
};

const step: CSSProperties = { marginBottom: 22 };

const stepLabel: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontWeight: 700,
  marginBottom: 10,
};

const stepNo: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  background: "var(--brand)",
  color: "#fff",
  fontSize: 13,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const groupLabel: CSSProperties = {
  fontSize: 12,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 6,
};

const fieldLabel: CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
};

const hint: CSSProperties = { display: "block", marginTop: 4, color: "var(--muted)" };

const linkButton: CSSProperties = {
  marginTop: 12,
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--brand)",
  fontWeight: 600,
  cursor: "pointer",
};

const submitRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 12,
  paddingTop: 16,
  borderTop: "1px solid var(--line)",
};

const CSS = `
.jt-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 16px;
  padding: 16px;
  background: var(--soft);
  border-radius: 10px;
}

.jt-route {
  display: flex;
  align-items: stretch;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
}

.jt-stop {
  position: relative;
  flex: 1 0 120px;
  min-width: 120px;
  text-align: center;
  padding: 14px 8px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  font: inherit;
  color: inherit;
}

.jt-stop-end { background: var(--soft); }

.jt-stop-btn { cursor: pointer; transition: box-shadow .15s, border-color .15s; }
.jt-stop-btn:hover { border-color: var(--brand); box-shadow: 0 2px 8px rgba(14,90,96,.18); }
.jt-selected { border-color: var(--brand); box-shadow: 0 0 0 2px rgba(14,90,96,.28); }

.jt-dot {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #c3cfcc;
  background: #fff;
  margin: 0 auto 8px;
}
.jt-dot-done { background: #16a34a; border-color: #16a34a; }

.jt-stop-name { font-weight: 700; word-break: break-word; }

.jt-stop-state {
  display: inline-block;
  margin-top: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.jt-chips { display: flex; flex-wrap: wrap; gap: 8px; }

.jt-chip {
  padding: 9px 16px;
  border-radius: 999px;
  border: 1px solid #c3cfcc;
  background: #fff;
  color: #0f172a;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background .12s, border-color .12s;
}
.jt-chip:hover { border-color: var(--brand); }
.jt-chip-on { background: var(--brand); border-color: var(--brand); color: #fff; }

.jt-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.jt-timeline { list-style: none; margin: 0; padding: 0 0 0 22px; position: relative; }
.jt-timeline::before {
  content: "";
  position: absolute;
  left: 6px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: var(--line);
}

.jt-item { position: relative; margin-bottom: 14px; }
.jt-pin {
  position: absolute;
  left: -22px;
  top: 16px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 0 0 1px var(--line);
}

.jt-card {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 14px;
  background: #fff;
}

@media (max-width: 640px) {
  .jt-stop { flex-basis: 100px; min-width: 100px; }
}
`;
