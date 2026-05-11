import { db } from "../config/db";

export async function listNotifications(tenantId: string) {
  const result = await db.query(
    `
    SELECT *
    FROM notifications
    WHERE tenant_id = $1::uuid
    ORDER BY created_at DESC
    `,
    [tenantId]
  );

  return result.rows;
}

export async function markNotificationAsRead(
  tenantId: string,
  notificationId: string
) {
  const result = await db.query(
    `
    UPDATE notifications
    SET is_read = true
    WHERE id = $1::uuid
      AND tenant_id = $2::uuid
    RETURNING *
    `,
    [notificationId, tenantId]
  );

  if (!result.rows[0]) {
    throw new Error("Notification not found");
  }

  return result.rows[0];
}

export async function createNotification(input: {
  tenantId: string;
  title: string;
  message: string;
  type: string;
}) {
  const result = await db.query(
    `
    INSERT INTO notifications (
      tenant_id,
      title,
      message,
      type
    )
    VALUES ($1::uuid, $2::varchar, $3::text, $4::varchar)
    RETURNING *
    `,
    [input.tenantId, input.title, input.message, input.type]
  );

  return result.rows[0];
}