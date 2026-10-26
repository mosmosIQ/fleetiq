import {
  FormEvent,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  listTrucks,
  Truck
} from "../../services/truckService";

import {
  listDrivers,
  Driver
} from "../../services/driverService";

import {
  completeTrip,
  createJourneyEvent,
  createTrip,
  JourneyEvent,
  JourneyEventType,
  listJourneyEvents,
  listTrips,
  ManualTripStatus,
  Trip,
  TripDestinationCountry,
  updateTripStatus
} from "../../services/tripService";

import {
  Batch,
  BatchDirection,
  createBatch,
  listBatches
} from "../../services/batchService";

import {
  listTrailers,
  Trailer
} from "../../services/trailerService";

import {
  listRouteTemplates,
  RouteTemplate
} from "../../services/routeTemplateService";


export default function TripManagerPage() {
  // ============================================================
  // MAIN DATA
  // ============================================================

  const [trips, setTrips] = useState<Trip[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [routeTemplates, setRouteTemplates] = useState<RouteTemplate[]>([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingBatch, setCreatingBatch] = useState(false);

  const [error, setError] = useState("");


  // ============================================================
  // TRIP FORM
  // ============================================================

  const [form, setForm] = useState({
    batch_id: "",
    truck_id: "",
    trailer_id: "",
    driver_id: "",

    route_from: "",
    route_to: "",
    destination_country: "DRC" as TripDestinationCountry,

    cargo_description: "",

    planned_start_at: "",
    expected_arrival_at: ""
  });


  // ============================================================
  // BATCH FORM
  // ============================================================

  const [batchForm, setBatchForm] = useState({
    direction: "NORTHBOUND" as BatchDirection,
    route_template_id: "",

    loading_point: "",

    truck_handover_date: "",
    loading_date: "",

    tons: "",

    release_date: "",

    notes: ""
  });


  // ============================================================
  // JOURNEY TRACKING
  // ============================================================

  const [selectedTrip, setSelectedTrip] =
    useState<Trip | null>(null);

  const [journeyEvents, setJourneyEvents] =
    useState<JourneyEvent[]>([]);

  const [loadingJourney, setLoadingJourney] =
    useState(false);

  const [creatingJourney, setCreatingJourney] =
    useState(false);


  // ============================================================
  // JOURNEY EVENT FORM
  // ============================================================

  const [journeyForm, setJourneyForm] = useState({
    checkpoint: "",
    custom_checkpoint: "",

    event_type: "ARRIVAL" as JourneyEventType,

    location: "",

    occurred_at: "",

    notes: "",

    latitude: "",

    longitude: ""
  });


  const checkpointOptions = useMemo(() => {
    // Checkpoints are snapshotted onto the batch when it is created.
    // This keeps the journey list tied to the route used for this trip.
    const tripWithSnapshot = selectedTrip as
      | (Trip & { checkpoint_snapshot?: string[] | null })
      | null;

    const snapshot = tripWithSnapshot?.checkpoint_snapshot;

    if (!Array.isArray(snapshot)) {
      return [];
    }

    return snapshot
      .filter((checkpoint): checkpoint is string =>
        typeof checkpoint === "string" && checkpoint.trim().length > 0
      )
      .map((checkpoint) => checkpoint.trim());
  }, [selectedTrip]);

  // ============================================================
  // LOAD ALL DATA
  // ============================================================

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        tripsData,
        trucksData,
        driversData,
        batchesData,
        trailersData,
        routeTemplatesData
      ] = await Promise.all([
        listTrips(),
        listTrucks(),
        listDrivers(),
        listBatches(),
        listTrailers(),
        listRouteTemplates()
      ]);

      setTrips(tripsData);
      setTrucks(trucksData);
      setDrivers(driversData);
      setBatches(batchesData);
      setTrailers(trailersData);
      setRouteTemplates(routeTemplatesData);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load trip data"
      );
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    loadData();
  }, []);


  // ============================================================
  // AVAILABLE TRUCKS
  // ============================================================

  const availableTrucks = useMemo(() => {
    return trucks.filter(
      (truck: any) =>
        truck.status === "AVAILABLE" &&
        !truck.active_trip_id
    );
  }, [trucks]);


  // ============================================================
  // AVAILABLE DRIVERS
  // ============================================================

  const availableDrivers = useMemo(() => {
    return drivers.filter(
      (driver: any) =>
        driver.is_active !== false &&
        driver.availability_status !== "ON_TRIP"
    );
  }, [drivers]);


  // ============================================================
  // AVAILABLE TRAILERS
  // ============================================================

  const availableTrailers = useMemo(() => {
    return trailers.filter(
      (trailer: any) =>
        trailer.status === "AVAILABLE" &&
        !trailer.active_trip_id
    );
  }, [trailers]);


  // ============================================================
  // AVAILABLE BATCHES
  // ============================================================

  const availableBatches = useMemo(() => {
    return batches.filter(
      (batch) => !batch.trip_id
    );
  }, [batches]);


  // ============================================================
  // CREATE BATCH
  // ============================================================

  async function handleCreateBatch(
    event: FormEvent
  ) {
    event.preventDefault();

    try {
      setCreatingBatch(true);
      setError("");

      if (!batchForm.route_template_id) {
        setError("Please select a route template for this batch.");
        return;
      }

      await createBatch({
        direction: batchForm.direction,
        route_template_id: batchForm.route_template_id,

        loading_point:
          batchForm.loading_point || undefined,

        truck_handover_date:
          batchForm.truck_handover_date || undefined,

        loading_date:
          batchForm.loading_date || undefined,

        tons:
          batchForm.tons
            ? Number(batchForm.tons)
            : undefined,

        release_date:
          batchForm.release_date || undefined,

        notes:
          batchForm.notes || undefined
      });

      setBatchForm({
        direction: "NORTHBOUND",
        route_template_id: "",
        loading_point: "",
        truck_handover_date: "",
        loading_date: "",
        tons: "",
        release_date: "",
        notes: ""
      });

      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create batch"
      );
    } finally {
      setCreatingBatch(false);
    }
  }


  // ============================================================
  // CREATE TRIP
  // ============================================================

  async function handleCreateTrip(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!form.batch_id) {
      setError("Please select a batch.");
      return;
    }

    if (!form.truck_id) {
      setError("Please select a truck.");
      return;
    }

    if (!form.trailer_id) {
      setError("Please select a trailer.");
      return;
    }

    if (!form.driver_id) {
      setError("Please select a driver.");
      return;
    }

    if (!form.route_from.trim()) {
      setError("Please enter the starting location.");
      return;
    }

    if (!form.route_to.trim()) {
      setError("Please enter the destination.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      await createTrip({
        batch_id: form.batch_id,

        truck_id: form.truck_id,

        trailer_id: form.trailer_id,

        driver_id: form.driver_id,

        route_from:
          form.route_from.trim(),

        route_to:
          form.route_to.trim(),

        destination_country: form.destination_country,

        cargo_description:
          form.cargo_description.trim() ||
          undefined,

        planned_start_at:
          form.planned_start_at ||
          undefined,

        expected_arrival_at:
          form.expected_arrival_at ||
          undefined
      });

      setForm({
        batch_id: "",
        truck_id: "",
        trailer_id: "",
        driver_id: "",
        route_from: "",
        route_to: "",
        destination_country: "DRC",
        cargo_description: "",
        planned_start_at: "",
        expected_arrival_at: ""
      });

      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create trip"
      );
    } finally {
      setCreating(false);
    }
  }


  // ============================================================
  // UPDATE TRIP STATUS
  // ============================================================

  async function handleStatusUpdate(
    tripId: string,
    status: ManualTripStatus
  ) {
    try {
      setError("");

      await updateTripStatus(
        tripId,
        status
      );

      await loadData();

      if (selectedTrip?.id === tripId) {
        const updatedTrip =
          trips.find(
            (trip) => trip.id === tripId
          );

        if (updatedTrip) {
          setSelectedTrip({
            ...updatedTrip,
            status
          });
        }
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update trip status"
      );
    }
  }


  // ============================================================
  // COMPLETE TRIP
  // ============================================================

  async function handleCompleteTrip(
    tripId: string
  ) {
    try {
      setError("");

      await completeTrip(tripId);

      await loadData();

      if (selectedTrip?.id === tripId) {
        setSelectedTrip(null);
        setJourneyEvents([]);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to complete trip"
      );
    }
  }


  // ============================================================
  // OPEN JOURNEY TRACKING
  // ============================================================

  async function handleOpenJourney(
    trip: Trip
  ) {
    try {
      setSelectedTrip(trip);

      setLoadingJourney(true);

      setError("");

      const events =
        await listJourneyEvents(
          trip.id
        );

      setJourneyEvents(events);

      setJourneyForm({
        checkpoint: "",
        custom_checkpoint: "",
        event_type: "ARRIVAL",
        location: "",
        occurred_at: "",
        notes: "",
        latitude: "",
        longitude: ""
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load journey history"
      );

      setJourneyEvents([]);
    } finally {
      setLoadingJourney(false);
    }
  }


  // ============================================================
  // CREATE JOURNEY EVENT
  // ============================================================

  async function handleCreateJourneyEvent(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!selectedTrip) {
      setError("Please select a trip first.");
      return;
    }

    const finalEvent =
      journeyForm.event_type === "FINAL_ARRIVAL" ||
      journeyForm.event_type === "FINAL_OFFLOADING";
    const checkpointValue =
      journeyForm.checkpoint === "__CUSTOM__"
        ? journeyForm.custom_checkpoint.trim()
        : journeyForm.checkpoint.trim();

    if (!finalEvent && checkpointValue.length < 2) {
      setError("Please select or enter a checkpoint.");
      return;
    }

    try {
      setCreatingJourney(true);

      setError("");

      await createJourneyEvent(
        selectedTrip.id,
        {
          checkpoint:
            checkpointValue,

          event_type:
            journeyForm.event_type,

          location:
            journeyForm.location.trim() ||
            undefined,

          occurred_at:
            journeyForm.occurred_at ||
            undefined,

          notes:
            journeyForm.notes.trim() ||
            undefined,

          latitude:
            journeyForm.latitude
              ? Number(journeyForm.latitude)
              : undefined,

          longitude:
            journeyForm.longitude
              ? Number(journeyForm.longitude)
              : undefined,

          source: "COMPANY_ADMIN"
        }
      );

      const events =
        await listJourneyEvents(
          selectedTrip.id
        );

      setJourneyEvents(events);

      setJourneyForm({
        checkpoint: "",
        custom_checkpoint: "",
        event_type: "ARRIVAL",
        location: "",
        occurred_at: "",
        notes: "",
        latitude: "",
        longitude: ""
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create journey event"
      );
    } finally {
      setCreatingJourney(false);
    }
  }


  // ============================================================
  // CLOSE JOURNEY TRACKING
  // ============================================================

  function closeJourney() {
    setSelectedTrip(null);
    setJourneyEvents([]);
    setJourneyForm({
      checkpoint: "",
      custom_checkpoint: "",
      event_type: "ARRIVAL",
      location: "",
      occurred_at: "",
      notes: "",
      latitude: "",
      longitude: ""
    });
  }


  // ============================================================
  // FORMAT DATE
  // ============================================================

  function formatDate(
    value?: string | null
  ) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }


  // ============================================================
  // STATUS CLASS
  // ============================================================

  function statusClass(
    status: string
  ) {
    switch (status) {
      case "COMPLETED":
      case "ARRIVED":
        return "status-success";

      case "STARTED":
      case "ON_ROUTE":
        return "status-info";

      case "DELAYED":
        return "status-warning";

      case "BREAKDOWN":
        return "status-danger";

      default:
        return "";
    }
  }


  // ============================================================
  // LATEST JOURNEY EVENT
  // ============================================================

  const latestJourneyEvent =
    journeyEvents.length > 0
      ? journeyEvents[journeyEvents.length - 1]
      : null;


  // ============================================================
  // LOADING SCREEN
  // ============================================================

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          Loading trip management...
        </div>
      </div>
    );
  }


  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="page-header">
        <div>
          <h1>Trip Manager</h1>

          <p>
            Create trips, assign vehicles and drivers,
            and track journeys.
          </p>
        </div>
      </div>


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="error">
          {error}
        </div>
      )}


      {/* ======================================================
          CREATE BATCH
      ====================================================== */}

      <div className="card">

        <div className="card-header">
          <div>
            <h2>Create Batch</h2>

            <p>
              Create a Northbound or Southbound
              operational batch before assigning it
              to a trip.
            </p>
          </div>
        </div>


        <form
          onSubmit={handleCreateBatch}
          className="grid"
        >

          {/* Direction */}

          <div>
            <label>
              Direction
            </label>

            <select
              className="input"
              value={batchForm.direction}
              onChange={(event) =>
                setBatchForm({
                  ...batchForm,
                  direction: event.target.value as BatchDirection,
                  route_template_id: ""
                })
              }
            >
              <option value="NORTHBOUND">
                NORTHBOUND
              </option>

              <option value="SOUTHBOUND">
                SOUTHBOUND
              </option>
            </select>
          </div>


          {/* Route Template */}

          <div>
            <label>
              Route Template
            </label>

            <select
              className="input"
              value={batchForm.route_template_id}
              required
              onChange={(event) =>
                setBatchForm({
                  ...batchForm,
                  route_template_id: event.target.value
                })
              }
            >
              <option value="">
                Select {batchForm.direction.toLowerCase()} route template
              </option>

              {routeTemplates
                .filter(
                  (template) =>
                    template.is_active &&
                    template.direction === batchForm.direction
                )
                .map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
            </select>

            {routeTemplates.filter(
              (template) =>
                template.is_active &&
                template.direction === batchForm.direction
            ).length === 0 && (
              <p style={{ marginTop: 6, fontSize: 13 }}>
                No active {batchForm.direction.toLowerCase()} templates found.
                Create one in Route Templates first.
              </p>
            )}

            {batchForm.route_template_id && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <strong>Checkpoints in this route:</strong>
                <ol style={{ marginTop: 4, paddingLeft: 20 }}>
                  {(routeTemplates.find(
                    (template) =>
                      template.id === batchForm.route_template_id
                  )?.checkpoints ?? []).map((checkpoint, index) => (
                    <li key={`${checkpoint}-${index}`}>{checkpoint}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>


          {/* Loading Point */}

          <div>
            <label>
              Loading Point
            </label>

            <input
              className="input"
              type="text"
              placeholder="KURASINI"
              value={batchForm.loading_point}
              onChange={(event) =>
                setBatchForm({
                  ...batchForm,
                  loading_point:
                    event.target.value
                })
              }
            />
          </div>


          {/* Handover Date */}

          <div>
            <label>
              Truck Handover Date
            </label>

            <input
              className="input"
              type="date"
              value={
                batchForm.truck_handover_date
              }
              onChange={(event) =>
                setBatchForm({
                  ...batchForm,
                  truck_handover_date:
                    event.target.value
                })
              }
            />
          </div>


          {/* Loading Date */}

          <div>
            <label>
              Loading Date
            </label>

            <input
              className="input"
              type="date"
              value={
                batchForm.loading_date
              }
              onChange={(event) =>
                setBatchForm({
                  ...batchForm,
                  loading_date:
                    event.target.value
                })
              }
            />
          </div>


          {/* Tons */}

          <div>
            <label>
              Tons
            </label>

            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={batchForm.tons}
              onChange={(event) =>
                setBatchForm({
                  ...batchForm,
                  tons: event.target.value
                })
              }
            />
          </div>


          {/* Release Date */}

          <div>
            <label>
              Release Date
            </label>

            <input
              className="input"
              type="date"
              value={
                batchForm.release_date
              }
              onChange={(event) =>
                setBatchForm({
                  ...batchForm,
                  release_date:
                    event.target.value
                })
              }
            />
          </div>


          {/* Notes */}

          <div>
            <label>
              Notes
            </label>

            <input
              className="input"
              type="text"
              placeholder="Optional notes"
              value={batchForm.notes}
              onChange={(event) =>
                setBatchForm({
                  ...batchForm,
                  notes: event.target.value
                })
              }
            />
          </div>


          {/* Button */}

          <div
            style={{
              display: "flex",
              alignItems: "end"
            }}
          >
            <button
              type="submit"
              className="button"
              disabled={creatingBatch || !batchForm.route_template_id}
            >
              {creatingBatch
                ? "Creating..."
                : "Create Batch"}
            </button>
          </div>

        </form>
      </div>


      {/* ======================================================
          CREATE TRIP
      ====================================================== */}

      <div className="card">

        <div className="card-header">
          <div>
            <h2>Create Trip</h2>

            <p>
              Assign a batch, truck, trailer and
              driver to the trip.
            </p>
          </div>
        </div>


        <form
          onSubmit={handleCreateTrip}
          className="grid"
        >

          {/* Batch */}

          <div>
            <label>
              Batch
            </label>

            <select
              className="input"
              value={form.batch_id}
              onChange={(event) =>
                setForm({
                  ...form,
                  batch_id:
                    event.target.value
                })
              }
            >
              <option value="">
                Select batch
              </option>

              {availableBatches.map(
                (batch) => (
                  <option
                    key={batch.id}
                    value={batch.id}
                  >
                    Batch {batch.batch_number} —{" "}
                    {batch.direction}
                    {batch.loading_point
                      ? ` — ${batch.loading_point}`
                      : ""}
                  </option>
                )
              )}
            </select>
          </div>


          {/* Truck */}

          <div>
            <label>
              Truck
            </label>

            <select
              className="input"
              value={form.truck_id}
              onChange={(event) =>
                setForm({
                  ...form,
                  truck_id:
                    event.target.value
                })
              }
            >
              <option value="">
                Select truck
              </option>

              {availableTrucks.map(
                (truck: any) => (
                  <option
                    key={truck.id}
                    value={truck.id}
                  >
                    {truck.plate_number}
                    {truck.truck_type
                      ? ` — ${truck.truck_type}`
                      : ""}
                  </option>
                )
              )}
            </select>
          </div>


          {/* Trailer */}

          <div>
            <label>
              Trailer
            </label>

            <select
              className="input"
              value={form.trailer_id}
              onChange={(event) =>
                setForm({
                  ...form,
                  trailer_id:
                    event.target.value
                })
              }
            >
              <option value="">
                Select trailer
              </option>

              {availableTrailers.map(
                (trailer: any) => (
                  <option
                    key={trailer.id}
                    value={trailer.id}
                  >
                    {trailer.trailer_number}
                    {trailer.trailer_type
                      ? ` — ${trailer.trailer_type}`
                      : ""}
                  </option>
                )
              )}
            </select>
          </div>


          {/* Driver */}

          <div>
            <label>
              Driver
            </label>

            <select
              className="input"
              value={form.driver_id}
              onChange={(event) =>
                setForm({
                  ...form,
                  driver_id:
                    event.target.value
                })
              }
            >
              <option value="">
                Select driver
              </option>

              {availableDrivers.map(
                (driver: any) => (
                  <option
                    key={driver.id}
                    value={driver.id}
                  >
                    {driver.full_name}
                    {driver.phone_number
                      ? ` — ${driver.phone_number}`
                      : ""}
                  </option>
                )
              )}
            </select>
          </div>


          {/* Route From */}

          <div>
            <label>
              Route From
            </label>

            <input
              className="input"
              type="text"
              placeholder="KURASINI"
              value={form.route_from}
              onChange={(event) =>
                setForm({
                  ...form,
                  route_from:
                    event.target.value
                })
              }
            />
          </div>


          {/* Route To */}

          <div>
            <label>
              Route To
            </label>

            <input
              className="input"
              type="text"
              placeholder="KOLWEZI"
              value={form.route_to}
              onChange={(event) =>
                setForm({
                  ...form,
                  route_to:
                    event.target.value
                })
              }
            />
          </div>


          {/* Destination Country */}

          <div>
            <label>Destination Country</label>
            <select
              className="input"
              value={form.destination_country}
              onChange={(event) =>
                setForm({
                  ...form,
                  destination_country: event.target.value as TripDestinationCountry
                })
              }
            >
              <option value="DRC">Democratic Republic of the Congo (DRC)</option>
              <option value="ZAMBIA">Zambia</option>
            </select>
          </div>

          {/* Cargo */}

          <div>
            <label>
              Cargo Description
            </label>

            <input
              className="input"
              type="text"
              placeholder="Optional cargo description"
              value={
                form.cargo_description
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  cargo_description:
                    event.target.value
                })
              }
            />
          </div>


          {/* Planned Start */}

          <div>
            <label>
              Planned Start
            </label>

            <input
              className="input"
              type="datetime-local"
              value={
                form.planned_start_at
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  planned_start_at:
                    event.target.value
                })
              }
            />
          </div>


          {/* Expected Arrival */}

          <div>
            <label>
              Expected Arrival
            </label>

            <input
              className="input"
              type="datetime-local"
              value={
                form.expected_arrival_at
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  expected_arrival_at:
                    event.target.value
                })
              }
            />
          </div>


          {/* Create */}

          <div
            style={{
              display: "flex",
              alignItems: "end"
            }}
          >
            <button
              type="submit"
              className="button"
              disabled={creating}
            >
              {creating
                ? "Creating..."
                : "Create Trip"}
            </button>
          </div>

        </form>
      </div>


      {/* ======================================================
          TRIPS TABLE
      ====================================================== */}

      <div className="card">

        <div className="card-header">
          <div>
            <h2>Trips</h2>

            <p>
              Manage active and completed trips.
            </p>
          </div>
        </div>


        {trips.length === 0 ? (
          <p>
            No trips found.
          </p>
        ) : (
          <div
            style={{
              overflowX: "auto"
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse"
              }}
            >
              <thead>
                <tr>
                  <th>Trip</th>
                  <th>Batch</th>
                  <th>Direction</th>
                  <th>Truck</th>
                  <th>Trailer</th>
                  <th>Driver</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {trips.map((trip) => (
                  <tr key={trip.id}>

                    {/* Trip */}

                    <td>
                      <strong>
                        {trip.public_trip_code}
                      </strong>
                    </td>


                    {/* Batch */}

                    <td>
                      {trip.batch_number
                        ? `Batch ${trip.batch_number}`
                        : "-"}
                    </td>


                    {/* Direction */}

                    <td>
                      {trip.batch_direction ? (
                        <span
                          className={
                            trip.batch_direction ===
                            "NORTHBOUND"
                              ? "status-badge status-info"
                              : "status-badge status-success"
                          }
                        >
                          {trip.batch_direction}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>


                    {/* Truck */}

                    <td>
                      {trip.plate_number}
                    </td>


                    {/* Trailer */}

                    <td>
                      {trip.trailer_number ||
                        "-"}
                    </td>


                    {/* Driver */}

                    <td>
                      {trip.driver_name}
                    </td>


                    {/* Route */}

                    <td>
                      {trip.route_from}
                      {" → "}
                      {trip.route_to}
                    </td>


                    {/* Status */}

                    <td>
                      <span
                        className={`status-badge ${statusClass(
                          trip.status
                        )}`}
                      >
                        {trip.status}
                      </span>
                    </td>


                    {/* Actions */}

                    <td>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px"
                        }}
                      >

                        <button
                          type="button"
                          className="button"
                          onClick={() =>
                            handleOpenJourney(
                              trip
                            )
                          }
                        >
                          Track Journey
                        </button>


                        {trip.status ===
                          "ASSIGNED" && (
                          <button
                            type="button"
                            className="button"
                            onClick={() =>
                              handleStatusUpdate(
                                trip.id,
                                "STARTED"
                              )
                            }
                          >
                            Start
                          </button>
                        )}


                        {trip.status ===
                          "STARTED" && (
                          <button
                            type="button"
                            className="button"
                            onClick={() =>
                              handleStatusUpdate(
                                trip.id,
                                "ON_ROUTE"
                              )
                            }
                          >
                            On Route
                          </button>
                        )}


                        {trip.status ===
                          "ON_ROUTE" && (
                          <>
                            <button
                              type="button"
                              className="button"
                              onClick={() =>
                                handleStatusUpdate(
                                  trip.id,
                                  "ARRIVED"
                                )
                              }
                            >
                              Arrived
                            </button>

                            <button
                              type="button"
                              className="button"
                              onClick={() =>
                                handleStatusUpdate(
                                  trip.id,
                                  "DELAYED"
                                )
                              }
                            >
                              Delayed
                            </button>

                            <button
                              type="button"
                              className="button"
                              onClick={() =>
                                handleStatusUpdate(
                                  trip.id,
                                  "BREAKDOWN"
                                )
                              }
                            >
                              Breakdown
                            </button>
                          </>
                        )}


                        {(trip.status ===
                          "ARRIVED" ||
                          trip.status ===
                            "DELAYED" ||
                          trip.status ===
                            "BREAKDOWN") && (
                          <button
                            type="button"
                            className="button"
                            onClick={() =>
                              handleCompleteTrip(
                                trip.id
                              )
                            }
                          >
                            Complete
                          </button>
                        )}

                      </div>

                    </td>

                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        )}

      </div>


      {/* ======================================================
          JOURNEY TRACKING
      ====================================================== */}

      {selectedTrip && (
        <div className="card">

          <div className="card-header">

            <div>
              <h2>
                Journey Tracking
              </h2>

              <p>
                Track the progress of{" "}
                <strong>
                  {selectedTrip.public_trip_code}
                </strong>
              </p>
            </div>


            <button
              type="button"
              className="button"
              onClick={closeJourney}
            >
              Close
            </button>

          </div>


          {/* ==================================================
              TRIP SUMMARY
          ================================================== */}

          <div className="grid">

            <div>
              <strong>
                Trip
              </strong>

              <div>
                {selectedTrip.public_trip_code}
              </div>
            </div>


            <div>
              <strong>
                Batch
              </strong>

              <div>
                {selectedTrip.batch_number
                  ? `Batch ${selectedTrip.batch_number}`
                  : "-"}
              </div>
            </div>


            <div>
              <strong>
                Direction
              </strong>

              <div>
                {selectedTrip.batch_direction ||
                  "-"}
              </div>
            </div>


            <div>
              <strong>
                Truck
              </strong>

              <div>
                {selectedTrip.plate_number}
              </div>
            </div>


            <div>
              <strong>
                Trailer
              </strong>

              <div>
                {selectedTrip.trailer_number ||
                  "-"}
              </div>
            </div>


            <div>
              <strong>
                Driver
              </strong>

              <div>
                {selectedTrip.driver_name}
              </div>
            </div>


            <div>
              <strong>
                Route
              </strong>

              <div>
                {selectedTrip.route_from}
                {" → "}
                {selectedTrip.route_to}
              </div>
            </div>


            <div>
              <strong>
                Trip Status
              </strong>

              <div>
                <span
                  className={`status-badge ${statusClass(
                    selectedTrip.status
                  )}`}
                >
                  {selectedTrip.status}
                </span>
              </div>
            </div>

          </div>


          {/* ==================================================
              CURRENT LOCATION
          ================================================== */}

          <div
            className="card"
            style={{
              marginTop: "20px"
            }}
          >

            <h3>
              Current Location
            </h3>

            {latestJourneyEvent ? (
              <div>

                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 600
                  }}
                >
                  {latestJourneyEvent.location ||
                    latestJourneyEvent.checkpoint}
                </div>

                <div>
                  Last event:{" "}
                  {latestJourneyEvent.event_type}
                </div>

                <div>
                  {formatDate(
                    latestJourneyEvent.occurred_at
                  )}
                </div>

              </div>
            ) : (
              <p>
                No journey events recorded yet.
              </p>
            )}

          </div>


          {/* ==================================================
              ADD JOURNEY EVENT
          ================================================== */}

          <div
            className="card"
            style={{
              marginTop: "20px"
            }}
          >

            <div className="card-header">
              <div>
                <h3>
                  Add Journey Event
                </h3>

                <p>
                  Record the latest movement
                  or checkpoint for this trip.
                </p>
              </div>
            </div>


            <form
              onSubmit={
                handleCreateJourneyEvent
              }
              className="grid"
            >

              {/* Checkpoint */}

              <div>
                <label>
                  Checkpoint {journeyForm.event_type !== "FINAL_ARRIVAL" &&
                    journeyForm.event_type !== "FINAL_OFFLOADING" ? "*" : "(optional)"}
                </label>
                <select
                  className="input"
                  value={journeyForm.checkpoint}
                  onChange={(event) =>
                    setJourneyForm({
                      ...journeyForm,
                      checkpoint: event.target.value,
                      custom_checkpoint: ""
                    })
                  }
                >
                  <option value="">Select checkpoint</option>
                  {checkpointOptions.map((checkpoint) => (
                    <option key={checkpoint} value={checkpoint}>{checkpoint}</option>
                  ))}
                  <option value="__CUSTOM__">Custom checkpoint…</option>
                </select>
                {journeyForm.checkpoint === "__CUSTOM__" && (
                  <input
                    className="input"
                    style={{ marginTop: 8 }}
                    type="text"
                    maxLength={100}
                    placeholder="Enter custom checkpoint"
                    value={journeyForm.custom_checkpoint}
                    onChange={(event) =>
                      setJourneyForm({
                        ...journeyForm,
                        custom_checkpoint: event.target.value
                      })
                    }
                  />
                )}
              </div>


              {/* Event Type */}

              <div>
                <label>
                  Event Type
                </label>

                <select
                  className="input"
                  value={
                    journeyForm.event_type
                  }
                  onChange={(event) =>
                    setJourneyForm({
                      ...journeyForm,
                      event_type:
                        event.target
                          .value as JourneyEventType
                    })
                  }
                >
                  <option value="HANDOVER">
                    HANDOVER
                  </option>

                  <option value="LOADING">
                    LOADING
                  </option>

                  <option value="RELEASE">
                    RELEASE
                  </option>

                  <option value="ARRIVAL">
                    ARRIVAL
                  </option>

                  <option value="DEPARTURE">
                    DEPARTURE
                  </option>

                  <option value="FINAL_ARRIVAL">
                    FINAL ARRIVAL
                  </option>

                  <option value="FINAL_OFFLOADING">
                    FINAL OFFLOADING
                  </option>
                </select>
              </div>


              {/* Location */}

              <div>
                <label>
                  Location
                </label>

                <input
                  className="input"
                  type="text"
                  placeholder="Tunduma Border"
                  value={
                    journeyForm.location
                  }
                  onChange={(event) =>
                    setJourneyForm({
                      ...journeyForm,
                      location:
                        event.target.value
                    })
                  }
                />
              </div>


              {/* Date */}

              <div>
                <label>
                  Date & Time
                </label>

                <input
                  className="input"
                  type="datetime-local"
                  value={
                    journeyForm.occurred_at
                  }
                  onChange={(event) =>
                    setJourneyForm({
                      ...journeyForm,
                      occurred_at:
                        event.target.value
                    })
                  }
                />
              </div>


              {/* Latitude */}

              <div>
                <label>
                  Latitude
                </label>

                <input
                  className="input"
                  type="number"
                  step="any"
                  placeholder="Optional"
                  value={
                    journeyForm.latitude
                  }
                  onChange={(event) =>
                    setJourneyForm({
                      ...journeyForm,
                      latitude:
                        event.target.value
                    })
                  }
                />
              </div>


              {/* Longitude */}

              <div>
                <label>
                  Longitude
                </label>

                <input
                  className="input"
                  type="number"
                  step="any"
                  placeholder="Optional"
                  value={
                    journeyForm.longitude
                  }
                  onChange={(event) =>
                    setJourneyForm({
                      ...journeyForm,
                      longitude:
                        event.target.value
                    })
                  }
                />
              </div>


              {/* Notes */}

              <div
                style={{
                  gridColumn:
                    "1 / -1"
                }}
              >
                <label>
                  Notes
                </label>

                <textarea
                  className="input"
                  rows={3}
                  placeholder="Optional notes"
                  value={
                    journeyForm.notes
                  }
                  onChange={(event) =>
                    setJourneyForm({
                      ...journeyForm,
                      notes:
                        event.target.value
                    })
                  }
                />
              </div>


              {/* Submit */}

              <div>
                <button
                  type="submit"
                  className="button"
                  disabled={
                    creatingJourney
                  }
                >
                  {creatingJourney
                    ? "Saving..."
                    : "Add Journey Event"}
                </button>
              </div>

            </form>

          </div>


          {/* ==================================================
              JOURNEY HISTORY
          ================================================== */}

          <div
            className="card"
            style={{
              marginTop: "20px"
            }}
          >

            <div className="card-header">
              <div>
                <h3>
                  Journey History
                </h3>

                <p>
                  All recorded checkpoints for
                  this trip.
                </p>
              </div>
            </div>


            {loadingJourney ? (
              <p>
                Loading journey history...
              </p>
            ) : journeyEvents.length === 0 ? (
              <p>
                No journey events recorded yet.
              </p>
            ) : (
              <div
                style={{
                  overflowX: "auto"
                }}
              >

                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse"
                  }}
                >

                  <thead>
                    <tr>
                      <th>
                        Date & Time
                      </th>

                      <th>
                        Checkpoint
                      </th>

                      <th>
                        Event
                      </th>

                      <th>
                        Location
                      </th>

                      <th>
                        Notes
                      </th>

                      <th>
                        Source
                      </th>
                    </tr>
                  </thead>


                  <tbody>

                    {journeyEvents.map(
                      (journeyEvent) => (
                        <tr
                          key={
                            journeyEvent.id
                          }
                        >

                          <td>
                            {formatDate(
                              journeyEvent.occurred_at
                            )}
                          </td>

                          <td>
                            <strong>
                              {
                                journeyEvent.checkpoint
                              }
                            </strong>
                          </td>

                          <td>
                            {
                              journeyEvent.event_type
                            }
                          </td>

                          <td>
                            {
                              journeyEvent.location ||
                              "-"
                            }
                          </td>

                          <td>
                            {
                              journeyEvent.notes ||
                              "-"
                            }
                          </td>

                          <td>
                            {
                              journeyEvent.source ||
                              "-"
                            }
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}