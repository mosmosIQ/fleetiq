import { db } from "../config/db";
import { createNotification } from "./notification.service";

/**
 * Reminders start this many days before a document expires and are then
 * sent EVERY DAY (at most one per document per day) until the expiry date.
 * e.g. 7 -> notifications on day 7, 6, 5, 4, 3, 2, 1 and on the expiry day.
 */
export const EXPIRY_REMINDER_DAYS = 7;

// "Today" is calculated in the company's local time zone.
const REMINDER_TIME_ZONE = "Africa/Dar_es_Salaam";

/**
 * Drivers whose leaving date has arrived become unavailable.
 * (Setting a leaving date also does this immediately when it is saved.)
 */
export async function deactivateLeftDrivers() {
  const result = await db.query(
    `
    UPDATE drivers
    SET is_active = false,
        updated_at = NOW()
    WHERE is_active = true
      AND leaving_date IS NOT NULL
      AND leaving_date <= (NOW() AT TIME ZONE $1)::date
    `,
    [REMINDER_TIME_ZONE]
  );

  return result.rowCount ?? 0;
}

function formatDate(value: unknown) {
  return new Date(`${String(value).slice(0, 10)}T00:00:00Z`).toLocaleDateString(
    "en-GB",
    { timeZone: "UTC" }
  );
}

function whenText(daysLeft: number, expiry: string) {
  if (daysLeft <= 0) return `expires TODAY (${expiry})`;
  if (daysLeft === 1) return `expires tomorrow (${expiry}) - 1 day remaining`;
  return `expires on ${expiry} (${daysLeft} days remaining)`;
}

/**
 * Called when the API starts and then every hour. It is safe to run often:
 * a document is only reminded about once per day.
 */
export async function runDriverExpiryReminders() {
  await deactivateLeftDrivers();

  const due = await db.query(
    `
    WITH today AS (
      SELECT (NOW() AT TIME ZONE $2)::date AS d
    )
    SELECT
      'DRIVER'::varchar AS entity_type,
      d.id AS entity_id,
      d.tenant_id,
      d.full_name AS label,
      'DRIVER_LICENSE'::varchar AS document_type,
      d.license_expiry_date AS expiry_date,
      NULL::varchar AS reference_number,
      (d.license_expiry_date - today.d) AS days_left,
      today.d AS today
    FROM drivers d, today
    WHERE d.is_active = true
      AND d.license_expiry_date BETWEEN today.d AND today.d + $1::int

    UNION ALL

    SELECT
      'DRIVER',
      d.id,
      d.tenant_id,
      d.full_name,
      'CHEMICAL_CERTIFICATE',
      d.chemical_certificate_expiry_date,
      NULL,
      (d.chemical_certificate_expiry_date - today.d),
      today.d
    FROM drivers d, today
    WHERE d.is_active = true
      AND d.chemical_certificate_expiry_date BETWEEN today.d AND today.d + $1::int

    UNION ALL

    SELECT
      'TRUCK',
      t.id,
      t.tenant_id,
      t.plate_number,
      'TRUCK_INSURANCE',
      t.insurance_expiry_date,
      t.insurance_number,
      (t.insurance_expiry_date - today.d),
      today.d
    FROM trucks t, today
    WHERE t.status <> 'INACTIVE'
      AND t.insurance_expiry_date BETWEEN today.d AND today.d + $1::int

    ORDER BY expiry_date ASC
    `,
    [EXPIRY_REMINDER_DAYS, REMINDER_TIME_ZONE]
  );

  let created = 0;

  for (const item of due.rows) {
    const reminder = await db.query(
      `
      INSERT INTO expiry_reminders (
        tenant_id,
        entity_type,
        entity_id,
        document_type,
        expiry_date,
        reminder_date
      )
      VALUES ($1::uuid, $2, $3::uuid, $4, $5::date, $6::date)
      ON CONFLICT (
        tenant_id,
        entity_type,
        entity_id,
        document_type,
        expiry_date,
        reminder_date
      )
      DO NOTHING
      RETURNING id
      `,
      [
        item.tenant_id,
        item.entity_type,
        item.entity_id,
        item.document_type,
        item.expiry_date,
        item.today
      ]
    );

    // Already reminded about this document today.
    if (!reminder.rowCount) {
      continue;
    }

    const expiry = formatDate(item.expiry_date);
    const daysLeft = Number(item.days_left);

    if (item.entity_type === "TRUCK") {
      await createNotification({
        tenantId: item.tenant_id,
        title: "Truck insurance expiry reminder",
        message:
          `Truck ${item.label}'s insurance` +
          (item.reference_number ? ` (No. ${item.reference_number})` : "") +
          ` ${whenText(daysLeft, expiry)}. Please arrange renewal.`,
        type: "TRUCK_DOCUMENT_EXPIRY"
      });
    } else {
      const kind =
        item.document_type === "DRIVER_LICENSE"
          ? "driver's licence"
          : "chemical certificate";

      await createNotification({
        tenantId: item.tenant_id,
        title: "Driver document expiry reminder",
        message:
          `${item.label}'s ${kind} ${whenText(daysLeft, expiry)}. ` +
          "Please arrange renewal.",
        type: "DRIVER_DOCUMENT_EXPIRY"
      });
    }

    created += 1;
  }

  return {
    checked: due.rowCount,
    created
  };
}
