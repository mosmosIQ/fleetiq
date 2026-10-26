
import { db } from "../config/db";
import { createNotification } from "./notification.service";

/**
 * Called when the API starts and every 24 hours.
 * Checks document expiries from today through the next 15 days.
 */
export async function runDriverExpiryReminders() {
  const due = await db.query(
    `
    SELECT
      d.id AS driver_id,
      d.tenant_id,
      d.full_name,
      'DRIVER_LICENSE'::varchar AS document_type,
      d.license_expiry_date AS expiry_date
    FROM drivers d
    WHERE d.is_active = true
      AND d.license_expiry_date
          BETWEEN CURRENT_DATE AND CURRENT_DATE + 15

    UNION ALL

    SELECT
      d.id AS driver_id,
      d.tenant_id,
      d.full_name,
      'CHEMICAL_CERTIFICATE'::varchar AS document_type,
      d.chemical_certificate_expiry_date AS expiry_date
    FROM drivers d
    WHERE d.is_active = true
      AND d.chemical_certificate_expiry_date
          BETWEEN CURRENT_DATE AND CURRENT_DATE + 15

    ORDER BY expiry_date ASC
    `
  );

  let created = 0;

  for (const item of due.rows) {
    const reminder = await db.query(
      `
      INSERT INTO driver_expiry_reminders (
        tenant_id,
        driver_id,
        document_type,
        expiry_date
      )
      VALUES ($1::uuid, $2::uuid, $3, $4::date)
      ON CONFLICT (
        tenant_id,
        driver_id,
        document_type,
        expiry_date
      )
      DO NOTHING
      RETURNING id
      `,
      [
        item.tenant_id,
        item.driver_id,
        item.document_type,
        item.expiry_date
      ]
    );

    // Already reminded for this document and expiry date.
    if (!reminder.rowCount) {
      continue;
    }

    const expiryDate = String(item.expiry_date).slice(0, 10);

    const expiry = new Date(
      `${expiryDate}T00:00:00Z`
    ).toLocaleDateString("en-GB", {
      timeZone: "UTC"
    });

    const kind =
      item.document_type === "DRIVER_LICENSE"
        ? "driver's licence"
        : "chemical certificate";

    const today = new Date()
      .toISOString()
      .slice(0, 10);

    const daysLeft = Math.max(
      0,
      Math.ceil(
        (
          new Date(`${expiryDate}T00:00:00Z`).getTime() -
          new Date(`${today}T00:00:00Z`).getTime()
        ) / 86_400_000
      )
    );

    await createNotification({
      tenantId: item.tenant_id,
      title: "Driver document expiry reminder",
      message:
        `${item.full_name}'s ${kind} expires on ${expiry} ` +
        `(${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining). ` +
        "Please arrange renewal.",
      type: "DRIVER_DOCUMENT_EXPIRY"
    });

    created += 1;
  }

  return {
    checked: due.rowCount,
    created
  };
}
