import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";

import {
  createFleetUnit,
  listFleetUnits,
  updateFleetUnit,
} from "../../services/fleetService";
import type {
  DriverData,
  FleetListResponse,
  FleetUnit,
  LinkAction,
  TrailerData,
  TruckData,
} from "../../services/fleetService";
import {
  updateTruckStatus,
  type ManageableTruckStatus,
} from "../../services/truckService";
import {
  updateTrailer,
  updateTrailerStatus,
} from "../../services/trailerService";
import { updateDriver } from "../../services/driverService";

// ------------------------------------------------------------
// constants & helpers
// ------------------------------------------------------------

const TRUCK_STATUSES: { value: ManageableTruckStatus; label: string }[] = [
  { value: "AVAILABLE", label: "Available" },
  { value: "UNDER_MAINTENANCE", label: "Under Maintenance" },
  { value: "ACCIDENTED", label: "Accidented" },
  { value: "INACTIVE", label: "Inactive" },
];

const TRAILER_STATUSES = [
  { value: "AVAILABLE", label: "Available" },
  { value: "UNDER_MAINTENANCE", label: "Under Maintenance" },
  { value: "INACTIVE", label: "Inactive" },
];

const emptyTruck = {
  plate_number: "",
  truck_type: "",
  capacity: "",
  status: "AVAILABLE",
};

const emptyTrailer = {
  trailer_number: "",
  trailer_type: "",
  trailer_model: "",
  status: "AVAILABLE",
};

const emptyDriver = {
  full_name: "",
  phone_number: "",
  passport_number: "",
  license_number: "",
  license_expiry_date: "",
  chemical_certificate_number: "",
  chemical_certificate_expiry_date: "",
  joining_date: "",
  leaving_date: "",
};

type TruckForm = typeof emptyTruck;
type TrailerForm = typeof emptyTrailer;
type DriverForm = typeof emptyDriver;

function apiMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data
      ?.message || fallback
  );
}

function pretty(status?: string | null) {
  return (status || "Unknown")
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function dateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="form-group">
      <label>{label}</label>
      {children}
    </div>
  );
}

function TruckFields({
  value,
  onChange,
  showStatus,
}: {
  value: TruckForm;
  onChange: (next: TruckForm) => void;
  showStatus: boolean;
}) {
  return (
    <div className="grid grid-3">
      <Field label="Plate Number *">
        <input
          className="input"
          value={value.plate_number}
          onChange={(e) => onChange({ ...value, plate_number: e.target.value })}
        />
      </Field>
      <Field label="Truck Type">
        <input
          className="input"
          value={value.truck_type}
          onChange={(e) => onChange({ ...value, truck_type: e.target.value })}
        />
      </Field>
      <Field label="Capacity">
        <input
          className="input"
          value={value.capacity}
          onChange={(e) => onChange({ ...value, capacity: e.target.value })}
        />
      </Field>
      {showStatus && (
        <Field label="Initial Status">
          <select
            className="input"
            value={value.status}
            onChange={(e) => onChange({ ...value, status: e.target.value })}
          >
            {TRUCK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      )}
    </div>
  );
}

function TrailerFields({
  value,
  onChange,
  showStatus,
}: {
  value: TrailerForm;
  onChange: (next: TrailerForm) => void;
  showStatus: boolean;
}) {
  return (
    <div className="grid grid-3">
      <Field label="Trailer Number *">
        <input
          className="input"
          value={value.trailer_number}
          onChange={(e) =>
            onChange({ ...value, trailer_number: e.target.value })
          }
        />
      </Field>
      <Field label="Trailer Type">
        <input
          className="input"
          value={value.trailer_type}
          onChange={(e) => onChange({ ...value, trailer_type: e.target.value })}
        />
      </Field>
      <Field label="Trailer Model">
        <input
          className="input"
          value={value.trailer_model}
          onChange={(e) =>
            onChange({ ...value, trailer_model: e.target.value })
          }
        />
      </Field>
      {showStatus && (
        <Field label="Initial Status">
          <select
            className="input"
            value={value.status}
            onChange={(e) => onChange({ ...value, status: e.target.value })}
          >
            {TRAILER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      )}
    </div>
  );
}

function DriverFields({
  value,
  onChange,
}: {
  value: DriverForm;
  onChange: (next: DriverForm) => void;
}) {
  const set = (key: keyof DriverForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => onChange({ ...value, [key]: e.target.value });

  return (
    <div className="grid grid-3">
      <Field label="Full Name *">
        <input className="input" value={value.full_name} onChange={set("full_name")} />
      </Field>
      <Field label="Phone Number *">
        <input
          className="input"
          value={value.phone_number}
          onChange={set("phone_number")}
        />
      </Field>
      <Field label="Passport No.">
        <input
          className="input"
          value={value.passport_number}
          onChange={set("passport_number")}
        />
      </Field>
      <Field label="Licence No.">
        <input
          className="input"
          value={value.license_number}
          onChange={set("license_number")}
        />
      </Field>
      <Field label="Licence Expiry">
        <input
          className="input"
          type="date"
          value={value.license_expiry_date}
          onChange={set("license_expiry_date")}
        />
      </Field>
      <Field label="Chemical Certificate No.">
        <input
          className="input"
          value={value.chemical_certificate_number}
          onChange={set("chemical_certificate_number")}
        />
      </Field>
      <Field label="Chemical Certificate Expiry">
        <input
          className="input"
          type="date"
          value={value.chemical_certificate_expiry_date}
          onChange={set("chemical_certificate_expiry_date")}
        />
      </Field>
      <Field label="Joining Date">
        <input
          className="input"
          type="date"
          value={value.joining_date}
          onChange={set("joining_date")}
        />
      </Field>
      <Field label="Leaving Date (when the driver exits)">
        <input
          className="input"
          type="date"
          value={value.leaving_date}
          min={value.joining_date || undefined}
          onChange={set("leaving_date")}
        />
        {value.leaving_date && (
          <small style={{ color: "var(--warning)" }}>
            Once this date arrives the driver is marked unavailable and cannot
            be assigned to trips. Clear the date to make them available again.
          </small>
        )}
      </Field>
    </div>
  );
}

function ModeSelect({
  value,
  options,
  onChange,
}: {
  value: LinkAction;
  options: { value: LinkAction; label: string }[];
  onChange: (next: LinkAction) => void;
}) {
  return (
    <select
      className="input"
      style={{ maxWidth: 320, marginBottom: 12 }}
      value={value}
      onChange={(e) => onChange(e.target.value as LinkAction)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ------------------------------------------------------------
// page
// ------------------------------------------------------------

export default function FleetRegistryPage() {
  const [data, setData] = useState<FleetListResponse>({
    units: [],
    unlinked_trailers: [],
    unlinked_drivers: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // ---- add form
  const [truck, setTruck] = useState<TruckForm>(emptyTruck);
  const [trailerMode, setTrailerMode] = useState<LinkAction>("create_new");
  const [trailer, setTrailer] = useState<TrailerForm>(emptyTrailer);
  const [trailerExisting, setTrailerExisting] = useState("");
  const [driverMode, setDriverMode] = useState<LinkAction>("create_new");
  const [driver, setDriver] = useState<DriverForm>(emptyDriver);
  const [driverExisting, setDriverExisting] = useState("");
  const [creating, setCreating] = useState(false);

  // ---- edit modal (a whole unit)
  const [editUnit, setEditUnit] = useState<FleetUnit | null>(null);
  const [eTruck, setETruck] = useState<TruckForm>(emptyTruck);
  const [eTrailerMode, setETrailerMode] = useState<LinkAction>("unlink");
  const [eTrailer, setETrailer] = useState<TrailerForm>(emptyTrailer);
  const [eTrailerExisting, setETrailerExisting] = useState("");
  const [eDriverMode, setEDriverMode] = useState<LinkAction>("unlink");
  const [eDriver, setEDriver] = useState<DriverForm>(emptyDriver);
  const [eDriverExisting, setEDriverExisting] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // ---- edit modal (an unlinked trailer / driver)
  const [orphanTrailerId, setOrphanTrailerId] = useState<string | null>(null);
  const [orphanDriverId, setOrphanDriverId] = useState<string | null>(null);
  const [oTrailer, setOTrailer] = useState<TrailerForm>(emptyTrailer);
  const [oDriver, setODriver] = useState<DriverForm>(emptyDriver);

  async function load(showLoader = true) {
    try {
      if (showLoader) setLoading(true);
      setData(await listFleetUnits());
    } catch (err) {
      setError(apiMessage(err, "Failed to load the fleet."));
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.units;

    return data.units.filter((u) =>
      [
        u.plate_number,
        u.truck_type,
        u.trailer_number,
        u.trailer_type,
        u.trailer_model,
        u.driver_name,
        u.driver_phone,
        u.driver_passport_number,
        u.driver_license_number,
        u.driver_chemical_certificate_number,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [data.units, search]);

  // ------------------------------------------------------------
  // create
  // ------------------------------------------------------------

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (truck.plate_number.trim().length < 2) {
      setError("Truck plate number is required.");
      return;
    }

    if (trailerMode === "create_new" && trailer.trailer_number.trim().length < 2) {
      setError("Enter the trailer number, or choose “No trailer”.");
      return;
    }

    if (trailerMode === "link_existing" && !trailerExisting) {
      setError("Select an existing trailer, or choose another option.");
      return;
    }

    if (
      driverMode === "create_new" &&
      (driver.full_name.trim().length < 2 ||
        driver.phone_number.trim().length < 5)
    ) {
      setError("Enter the driver's name and phone number, or choose “No driver”.");
      return;
    }

    if (driverMode === "link_existing" && !driverExisting) {
      setError("Select an existing driver, or choose another option.");
      return;
    }

    try {
      setCreating(true);

      await createFleetUnit({
        truck: {
          plate_number: truck.plate_number.trim().toUpperCase(),
          truck_type: truck.truck_type.trim(),
          capacity: truck.capacity.trim(),
          status: truck.status,
        },
        trailer:
          trailerMode === "create_new"
            ? { action: "create_new", data: trailer as TrailerData }
            : trailerMode === "link_existing"
            ? { action: "link_existing", id: trailerExisting }
            : { action: "unlink" },
        driver:
          driverMode === "create_new"
            ? { action: "create_new", data: driver as DriverData }
            : driverMode === "link_existing"
            ? { action: "link_existing", id: driverExisting }
            : { action: "unlink" },
      });

      setTruck(emptyTruck);
      setTrailer(emptyTrailer);
      setDriver(emptyDriver);
      setTrailerExisting("");
      setDriverExisting("");
      setSuccess("Truck, trailer and driver saved successfully.");
      await load(false);
    } catch (err) {
      setError(apiMessage(err, "Failed to save. Please check the details."));
    } finally {
      setCreating(false);
    }
  }

  // ------------------------------------------------------------
  // inline status changes (same rules as the old pages)
  // ------------------------------------------------------------

  async function changeTruckStatus(unit: FleetUnit, status: string) {
    try {
      setBusyId(unit.id);
      setError("");
      setSuccess("");
      await updateTruckStatus(unit.id, status as ManageableTruckStatus);
      await load(false);
    } catch (err) {
      setError(apiMessage(err, "Failed to update truck status."));
    } finally {
      setBusyId(null);
    }
  }

  async function changeTrailerStatus(
    unit: FleetUnit,
    trailerId: string,
    status: string
  ) {
    try {
      setBusyId(unit.id);
      setError("");
      setSuccess("");
      await updateTrailerStatus(trailerId, status);
      await load(false);
    } catch (err) {
      setError(apiMessage(err, "Failed to update trailer status."));
    } finally {
      setBusyId(null);
    }
  }

  // ------------------------------------------------------------
  // edit a unit
  // ------------------------------------------------------------

  function openEdit(unit: FleetUnit) {
    setError("");
    setSuccess("");
    setEditError("");
    setEditUnit(unit);

    setETruck({
      plate_number: unit.plate_number,
      truck_type: unit.truck_type || "",
      capacity: unit.capacity || "",
      status: unit.status,
    });

    setETrailerMode(unit.assigned_trailer_id ? "keep" : "unlink");
    setETrailerExisting("");
    setETrailer({
      trailer_number: unit.trailer_number || "",
      trailer_type: unit.trailer_type || "",
      trailer_model: unit.trailer_model || "",
      status: unit.trailer_status || "AVAILABLE",
    });

    setEDriverMode(unit.assigned_driver_id ? "keep" : "unlink");
    setEDriverExisting("");
    setEDriver({
      full_name: unit.driver_name || "",
      phone_number: unit.driver_phone || "",
      passport_number: unit.driver_passport_number || "",
      license_number: unit.driver_license_number || "",
      license_expiry_date: dateInput(unit.driver_license_expiry_date),
      chemical_certificate_number:
        unit.driver_chemical_certificate_number || "",
      chemical_certificate_expiry_date: dateInput(
        unit.driver_chemical_certificate_expiry_date
      ),
      joining_date: dateInput(unit.driver_joining_date),
      leaving_date: dateInput(unit.driver_leaving_date),
    });
  }

  async function handleSaveUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editUnit) return;
    setEditError("");

    if (eTruck.plate_number.trim().length < 2) {
      setEditError("Truck plate number is required.");
      return;
    }

    if (eTrailerMode === "link_existing" && !eTrailerExisting) {
      setEditError("Select a trailer to link.");
      return;
    }

    if (eDriverMode === "link_existing" && !eDriverExisting) {
      setEditError("Select a driver to link.");
      return;
    }

    if (eTrailerMode === "keep" && eTrailer.trailer_number.trim().length < 2) {
      setEditError("Trailer number is required.");
      return;
    }

    if (eTrailerMode === "create_new" && eTrailer.trailer_number.trim().length < 2) {
      setEditError("Enter the new trailer's number.");
      return;
    }

    if (
      (eDriverMode === "keep" || eDriverMode === "create_new") &&
      (eDriver.full_name.trim().length < 2 ||
        eDriver.phone_number.trim().length < 5)
    ) {
      setEditError("Driver name and phone number are required.");
      return;
    }

    const trailerData = {
      trailer_number: eTrailer.trailer_number.trim(),
      trailer_type: eTrailer.trailer_type.trim(),
      trailer_model: eTrailer.trailer_model.trim(),
      ...(eTrailerMode === "create_new" ? { status: eTrailer.status } : {}),
    };

    const driverData: DriverData = {
      full_name: eDriver.full_name.trim(),
      phone_number: eDriver.phone_number.trim(),
      passport_number: eDriver.passport_number.trim(),
      license_number: eDriver.license_number.trim(),
      license_expiry_date: eDriver.license_expiry_date,
      chemical_certificate_number: eDriver.chemical_certificate_number.trim(),
      chemical_certificate_expiry_date: eDriver.chemical_certificate_expiry_date,
      joining_date: eDriver.joining_date,
      leaving_date: eDriver.leaving_date,
    };

    try {
      setSaving(true);

      await updateFleetUnit(editUnit.id, {
        truck: {
          plate_number: eTruck.plate_number.trim().toUpperCase(),
          truck_type: eTruck.truck_type.trim(),
          capacity: eTruck.capacity.trim(),
        },
        trailer:
          eTrailerMode === "link_existing"
            ? { action: "link_existing", id: eTrailerExisting }
            : eTrailerMode === "unlink"
            ? { action: "unlink" }
            : { action: eTrailerMode, data: trailerData },
        driver:
          eDriverMode === "link_existing"
            ? { action: "link_existing", id: eDriverExisting }
            : eDriverMode === "unlink"
            ? { action: "unlink" }
            : { action: eDriverMode, data: driverData },
      });

      setEditUnit(null);
      setSuccess("Changes saved.");
      await load(false);
    } catch (err) {
      setEditError(apiMessage(err, "Failed to save changes."));
    } finally {
      setSaving(false);
    }
  }

  // ------------------------------------------------------------
  // edit unlinked trailer / driver
  // ------------------------------------------------------------

  async function handleSaveOrphanTrailer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orphanTrailerId) return;

    try {
      setSaving(true);
      setEditError("");
      await updateTrailer(orphanTrailerId, {
        trailer_number: oTrailer.trailer_number.trim(),
        trailer_type: oTrailer.trailer_type.trim(),
        trailer_model: oTrailer.trailer_model.trim(),
      });
      setOrphanTrailerId(null);
      setSuccess("Trailer updated.");
      await load(false);
    } catch (err) {
      setEditError(apiMessage(err, "Failed to update trailer."));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveOrphanDriver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orphanDriverId) return;

    try {
      setSaving(true);
      setEditError("");
      await updateDriver(orphanDriverId, {
        full_name: oDriver.full_name.trim(),
        phone_number: oDriver.phone_number.trim(),
        passport_number: oDriver.passport_number.trim(),
        license_number: oDriver.license_number.trim(),
        license_expiry_date: oDriver.license_expiry_date,
        chemical_certificate_number: oDriver.chemical_certificate_number.trim(),
        chemical_certificate_expiry_date: oDriver.chemical_certificate_expiry_date,
        joining_date: oDriver.joining_date,
        leaving_date: oDriver.leaving_date,
      });
      setOrphanDriverId(null);
      setSuccess("Driver updated.");
      await load(false);
    } catch (err) {
      setEditError(apiMessage(err, "Failed to update driver."));
    } finally {
      setSaving(false);
    }
  }

  // ------------------------------------------------------------
  // render
  // ------------------------------------------------------------

  const unlinkedTrailerOptions = data.unlinked_trailers;
  const unlinkedDriverOptions = data.unlinked_drivers.filter(
    (d) => d.is_active !== false
  );

  return (
    <div className="page">
      <h1>Fleet Registry</h1>
      <p>
        Register a truck together with its trailer and driver in one step. Each
        truck keeps its own linked trailer and driver, and everything can be
        edited at any time. Upload driver passport, licence and chemical
        certificate files on the Driver Documents page.
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

      {/* ---------------- ADD ---------------- */}
      <form className="card" onSubmit={handleCreate} style={{ marginBottom: 24 }}>
        <h2>Add Truck, Trailer &amp; Driver</h2>

        <h3 style={{ marginTop: 16 }}>1. Truck</h3>
        <TruckFields value={truck} onChange={setTruck} showStatus />

        <h3 style={{ marginTop: 20 }}>2. Trailer</h3>
        <ModeSelect
          value={trailerMode}
          onChange={setTrailerMode}
          options={[
            { value: "create_new", label: "Add a new trailer" },
            { value: "link_existing", label: "Use an existing unlinked trailer" },
            { value: "unlink", label: "No trailer for now" },
          ]}
        />
        {trailerMode === "create_new" && (
          <TrailerFields value={trailer} onChange={setTrailer} showStatus />
        )}
        {trailerMode === "link_existing" && (
          <select
            className="input"
            value={trailerExisting}
            onChange={(e) => setTrailerExisting(e.target.value)}
          >
            <option value="">Select trailer</option>
            {unlinkedTrailerOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.trailer_number}
                {t.trailer_type ? ` — ${t.trailer_type}` : ""}
                {t.trailer_model ? ` (${t.trailer_model})` : ""}
              </option>
            ))}
          </select>
        )}

        <h3 style={{ marginTop: 20 }}>3. Driver</h3>
        <ModeSelect
          value={driverMode}
          onChange={setDriverMode}
          options={[
            { value: "create_new", label: "Add a new driver" },
            { value: "link_existing", label: "Use an existing unlinked driver" },
            { value: "unlink", label: "No driver for now" },
          ]}
        />
        {driverMode === "create_new" && (
          <DriverFields value={driver} onChange={setDriver} />
        )}
        {driverMode === "link_existing" && (
          <select
            className="input"
            value={driverExisting}
            onChange={(e) => setDriverExisting(e.target.value)}
          >
            <option value="">Select driver</option>
            {unlinkedDriverOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name} — {d.phone_number}
              </option>
            ))}
          </select>
        )}

        <div style={{ marginTop: 20 }}>
          <button className="button" type="submit" disabled={creating}>
            {creating ? "Saving..." : "Save Truck, Trailer & Driver"}
          </button>
        </div>
      </form>

      {/* ---------------- LIST ---------------- */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <h2>Fleet</h2>
          <input
            className="input"
            style={{ maxWidth: 320 }}
            placeholder="Search trucks, trailers or drivers"
            aria-label="Search fleet"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p>Loading fleet...</p>
        ) : filteredUnits.length === 0 ? (
          <p>
            {data.units.length === 0
              ? "No trucks registered yet."
              : "No results match your search."}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Truck</th>
                  <th style={thStyle}>Truck Status</th>
                  <th style={thStyle}>Trailer</th>
                  <th style={thStyle}>Trailer Status</th>
                  <th style={thStyle}>Driver</th>
                  <th style={thStyle}>Driver IDs</th>
                  <th style={thStyle}>Edit</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((unit) => {
                  const truckLocked = Boolean(unit.active_trip_id);
                  const trailerLocked = Boolean(unit.trailer_active_trip_code);
                  const busy = busyId === unit.id;
                  const displayStatus = truckLocked ? "ON_TRIP" : unit.status;

                  return (
                    <tr key={unit.id}>
                      <td style={tdStyle}>
                        <strong>{unit.plate_number}</strong>
                        <div style={subStyle}>
                          {[unit.truck_type, unit.capacity]
                            .filter(Boolean)
                            .join(" · ") || "-"}
                        </div>
                      </td>

                      <td style={tdStyle}>
                        {truckLocked ? (
                          <>
                            <span style={badgeStyle}>{pretty(displayStatus)}</span>
                            <div style={subStyle}>Trip: {unit.active_trip_code}</div>
                          </>
                        ) : (
                          <select
                            className="input"
                            disabled={busy}
                            value={
                              TRUCK_STATUSES.some((s) => s.value === unit.status)
                                ? unit.status
                                : ""
                            }
                            onChange={(e) =>
                              void changeTruckStatus(unit, e.target.value)
                            }
                          >
                            {!TRUCK_STATUSES.some((s) => s.value === unit.status) && (
                              <option value="" disabled>
                                {pretty(unit.status)}
                              </option>
                            )}
                            {TRUCK_STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      <td style={tdStyle}>
                        {unit.assigned_trailer_id ? (
                          <>
                            <strong>{unit.trailer_number}</strong>
                            <div style={subStyle}>
                              {[unit.trailer_type, unit.trailer_model]
                                .filter(Boolean)
                                .join(" · ") || "-"}
                            </div>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td style={tdStyle}>
                        {unit.assigned_trailer_id ? (
                          trailerLocked ? (
                            <>
                              <span style={badgeStyle}>On Trip</span>
                              <div style={subStyle}>
                                Trip: {unit.trailer_active_trip_code}
                              </div>
                            </>
                          ) : (
                            <select
                              className="input"
                              disabled={busy}
                              value={unit.trailer_status || "AVAILABLE"}
                              onChange={(e) =>
                                void changeTrailerStatus(
                                  unit,
                                  unit.assigned_trailer_id as string,
                                  e.target.value
                                )
                              }
                            >
                              {TRAILER_STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          )
                        ) : (
                          "-"
                        )}
                      </td>

                      <td style={tdStyle}>
                        {unit.assigned_driver_id ? (
                          <>
                            <strong>{unit.driver_name}</strong>
                            <div style={subStyle}>{unit.driver_phone}</div>
                            <div style={subStyle}>
                              {unit.driver_is_active === false
                                ? "Left — unavailable"
                                : unit.driver_active_trip_code
                                ? `On trip (${unit.driver_active_trip_code})`
                                : "Available"}
                            </div>
                            {(unit.driver_joining_date ||
                              unit.driver_leaving_date) && (
                              <div style={subStyle}>
                                {unit.driver_joining_date
                                  ? `Joined ${dateInput(unit.driver_joining_date)}`
                                  : ""}
                                {unit.driver_leaving_date
                                  ? ` · Left ${dateInput(unit.driver_leaving_date)}`
                                  : ""}
                              </div>
                            )}
                          </>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td style={tdStyle}>
                        {unit.assigned_driver_id ? (
                          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                            <div>Passport: {unit.driver_passport_number || "-"}</div>
                            <div>Licence: {unit.driver_license_number || "-"}</div>
                            <div>
                              Chem. cert:{" "}
                              {unit.driver_chemical_certificate_number || "-"}
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td style={tdStyle}>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => openEdit(unit)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- UNLINKED ---------------- */}
      {(data.unlinked_trailers.length > 0 ||
        data.unlinked_drivers.length > 0) && (
        <div className="card" style={{ marginTop: 24 }}>
          <h2>Not Linked to a Truck</h2>
          <p>
            These trailers and drivers exist but are not attached to a truck.
            Edit a truck above to link them, or edit them here.
          </p>

          {data.unlinked_trailers.length > 0 && (
            <>
              <h3>Trailers</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {data.unlinked_trailers.map((t) => (
                  <li
                    key={t.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <span style={{ flex: 1 }}>
                      <strong>{t.trailer_number}</strong>{" "}
                      {[t.trailer_type, t.trailer_model]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        setEditError("");
                        setOrphanTrailerId(t.id);
                        setOTrailer({
                          trailer_number: t.trailer_number,
                          trailer_type: t.trailer_type || "",
                          trailer_model: t.trailer_model || "",
                          status: t.status,
                        });
                      }}
                    >
                      Edit
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {data.unlinked_drivers.length > 0 && (
            <>
              <h3>Drivers</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {data.unlinked_drivers.map((d) => (
                  <li
                    key={d.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <span style={{ flex: 1 }}>
                      <strong>{d.full_name}</strong> — {d.phone_number}
                      {d.is_active === false && (
                        <span style={{ color: "var(--warning)", marginLeft: 8 }}>
                          (left{d.leaving_date ? ` ${dateInput(d.leaving_date)}` : ""})
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        setEditError("");
                        setOrphanDriverId(d.id);
                        setODriver({
                          full_name: d.full_name,
                          phone_number: d.phone_number,
                          passport_number: d.passport_number || "",
                          license_number: d.license_number || "",
                          license_expiry_date: dateInput(d.license_expiry_date),
                          chemical_certificate_number:
                            d.chemical_certificate_number || "",
                          chemical_certificate_expiry_date: dateInput(
                            d.chemical_certificate_expiry_date
                          ),
                          joining_date: dateInput(d.joining_date),
                          leaving_date: dateInput(d.leaving_date),
                        });
                      }}
                    >
                      Edit
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* ---------------- EDIT UNIT MODAL ---------------- */}
      {editUnit && (
        <Modal onClose={() => !saving && setEditUnit(null)}>
          <form onSubmit={handleSaveUnit}>
            <h2>Edit — {editUnit.plate_number}</h2>

            {editError && (
              <p role="alert" style={{ color: "var(--danger)", fontWeight: 600 }}>
                {editError}
              </p>
            )}

            <h3>Truck</h3>
            <TruckFields value={eTruck} onChange={setETruck} showStatus={false} />

            <h3 style={{ marginTop: 20 }}>Trailer</h3>
            <ModeSelect
              value={eTrailerMode}
              onChange={setETrailerMode}
              options={[
                ...(editUnit.assigned_trailer_id
                  ? [{ value: "keep" as LinkAction, label: "Edit the linked trailer" }]
                  : []),
                { value: "link_existing", label: "Link a different existing trailer" },
                { value: "create_new", label: "Add a new trailer" },
                { value: "unlink", label: "No trailer (unlink)" },
              ]}
            />
            {(eTrailerMode === "keep" || eTrailerMode === "create_new") && (
              <TrailerFields
                value={eTrailer}
                onChange={setETrailer}
                showStatus={eTrailerMode === "create_new"}
              />
            )}
            {eTrailerMode === "link_existing" && (
              <select
                className="input"
                value={eTrailerExisting}
                onChange={(e) => setETrailerExisting(e.target.value)}
              >
                <option value="">Select trailer</option>
                {unlinkedTrailerOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.trailer_number}
                    {t.trailer_type ? ` — ${t.trailer_type}` : ""}
                    {t.trailer_model ? ` (${t.trailer_model})` : ""}
                  </option>
                ))}
              </select>
            )}

            <h3 style={{ marginTop: 20 }}>Driver</h3>
            <ModeSelect
              value={eDriverMode}
              onChange={setEDriverMode}
              options={[
                ...(editUnit.assigned_driver_id
                  ? [{ value: "keep" as LinkAction, label: "Edit the linked driver" }]
                  : []),
                { value: "link_existing", label: "Link a different existing driver" },
                { value: "create_new", label: "Add a new driver" },
                { value: "unlink", label: "No driver (unlink)" },
              ]}
            />
            {(eDriverMode === "keep" || eDriverMode === "create_new") && (
              <DriverFields value={eDriver} onChange={setEDriver} />
            )}
            {eDriverMode === "link_existing" && (
              <select
                className="input"
                value={eDriverExisting}
                onChange={(e) => setEDriverExisting(e.target.value)}
              >
                <option value="">Select driver</option>
                {unlinkedDriverOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} — {d.phone_number}
                  </option>
                ))}
              </select>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button className="button" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                className="button button-secondary"
                type="button"
                disabled={saving}
                onClick={() => setEditUnit(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ---------------- EDIT UNLINKED TRAILER ---------------- */}
      {orphanTrailerId && (
        <Modal onClose={() => !saving && setOrphanTrailerId(null)}>
          <form onSubmit={handleSaveOrphanTrailer}>
            <h2>Edit Trailer</h2>
            {editError && (
              <p role="alert" style={{ color: "var(--danger)", fontWeight: 600 }}>
                {editError}
              </p>
            )}
            <TrailerFields value={oTrailer} onChange={setOTrailer} showStatus={false} />
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button className="button" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setOrphanTrailerId(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ---------------- EDIT UNLINKED DRIVER ---------------- */}
      {orphanDriverId && (
        <Modal onClose={() => !saving && setOrphanDriverId(null)}>
          <form onSubmit={handleSaveOrphanDriver}>
            <h2>Edit Driver</h2>
            {editError && (
              <p role="alert" style={{ color: "var(--danger)", fontWeight: 600 }}>
                {editError}
              </p>
            )}
            <DriverFields value={oDriver} onChange={setODriver} />
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button className="button" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setOrphanDriverId(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div role="presentation" onClick={onClose} style={overlayStyle}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={modalStyle}
      >
        {children}
      </div>
    </div>
  );
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: 10,
  borderBottom: "1px solid var(--line)",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: 10,
  borderBottom: "1px solid var(--line)",
  verticalAlign: "top",
};

const subStyle: CSSProperties = {
  fontSize: 12,
  marginTop: 4,
  opacity: 0.75,
};

const badgeStyle: CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background: "#dbeafe",
  color: "#1e40af",
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: 20,
  overflowY: "auto",
};

const modalStyle: CSSProperties = {
  background: "#fff",
  color: "var(--ink)",
  width: "min(900px, 96vw)",
  padding: 24,
  borderRadius: 12,
  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
  margin: "20px 0",
};
