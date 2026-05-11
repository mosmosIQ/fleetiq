import { db } from "../config/db";
import { getCurrentMonthKey } from "../utils/dateUtils";

export async function canSendMessage(tenantId: string, channel: "sms" | "whatsapp") {
  const month = getCurrentMonthKey();

  const result = await db.query(
    `SELECT sp.sms_monthly_limit, sp.whatsapp_monthly_limit,
            COALESCE(mu.sms_sent, 0) AS sms_sent,
            COALESCE(mu.whatsapp_sent, 0) AS whatsapp_sent
     FROM tenant_subscriptions ts
     JOIN subscription_plans sp ON sp.id = ts.plan_id
     LEFT JOIN message_usage mu ON mu.tenant_id = ts.tenant_id AND mu.month = $2
     WHERE ts.tenant_id = $1
     ORDER BY ts.created_at DESC
     LIMIT 1`,
    [tenantId, month]
  );

  const row = result.rows[0];
  if (!row) throw new Error("Subscription not found");

  return channel === "sms"
    ? Number(row.sms_sent) < Number(row.sms_monthly_limit)
    : Number(row.whatsapp_sent) < Number(row.whatsapp_monthly_limit);
}

export async function incrementMessageUsage(tenantId: string, channel: "sms" | "whatsapp") {
  const month = getCurrentMonthKey();

  await db.query(
    `INSERT INTO message_usage (tenant_id, month, sms_sent, whatsapp_sent)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tenant_id, month)
     DO UPDATE SET
       sms_sent = message_usage.sms_sent + EXCLUDED.sms_sent,
       whatsapp_sent = message_usage.whatsapp_sent + EXCLUDED.whatsapp_sent,
       updated_at = NOW()`,
    [tenantId, month, channel === "sms" ? 1 : 0, channel === "whatsapp" ? 1 : 0]
  );
}
