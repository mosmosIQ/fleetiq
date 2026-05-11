import { db } from "../config/db";

function getCurrentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function getTenantSubscriptionSummary(tenantId: string) {
  const month = getCurrentMonthKey();

  const result = await db.query(
    `
    SELECT
      ts.status AS subscription_status,
      ts.current_period_start,
      ts.current_period_end,

      sp.name AS plan_name,
      sp.truck_limit,
      sp.driver_limit,
      sp.company_admin_limit,
      sp.sms_monthly_limit,
      sp.whatsapp_monthly_limit,

      (SELECT COUNT(*)::int FROM trucks WHERE tenant_id = $1::uuid) AS trucks_used,
      (SELECT COUNT(*)::int FROM drivers WHERE tenant_id = $1::uuid) AS drivers_used,
      (
        SELECT COUNT(*)::int
        FROM users
        WHERE tenant_id = $1::uuid
          AND role = 'COMPANY_ADMIN'
          AND is_active = true
      ) AS company_admins_used,

      COALESCE(mu.sms_sent, 0)::int AS sms_used,
      COALESCE(mu.whatsapp_sent, 0)::int AS whatsapp_used

    FROM tenant_subscriptions ts
    JOIN subscription_plans sp
      ON sp.id = ts.plan_id
    LEFT JOIN message_usage mu
      ON mu.tenant_id = ts.tenant_id
     AND mu.month = $2::varchar
    WHERE ts.tenant_id = $1::uuid
    ORDER BY ts.created_at DESC
    LIMIT 1
    `,
    [tenantId, month]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Subscription not found for this company");
  }

  return {
    plan_name: row.plan_name,
    subscription_status: row.subscription_status,
    current_period_start: row.current_period_start,
    current_period_end: row.current_period_end,
    month,

    limits: {
      trucks: Number(row.truck_limit),
      drivers: Number(row.driver_limit),
      company_admins: Number(row.company_admin_limit),
      sms: Number(row.sms_monthly_limit),
      whatsapp: Number(row.whatsapp_monthly_limit)
    },

    usage: {
      trucks: Number(row.trucks_used),
      drivers: Number(row.drivers_used),
      company_admins: Number(row.company_admins_used),
      sms: Number(row.sms_used),
      whatsapp: Number(row.whatsapp_used)
    }
  };
}

export async function ensureCanAddTruck(tenantId: string) {
  const summary = await getTenantSubscriptionSummary(tenantId);

  if (summary.usage.trucks >= summary.limits.trucks) {
    throw new Error(
      `Truck limit reached. Your ${summary.plan_name} plan allows ${summary.limits.trucks} trucks.`
    );
  }
}

export async function ensureCanAddDriver(tenantId: string) {
  const summary = await getTenantSubscriptionSummary(tenantId);

  if (summary.usage.drivers >= summary.limits.drivers) {
    throw new Error(
      `Driver limit reached. Your ${summary.plan_name} plan allows ${summary.limits.drivers} drivers.`
    );
  }
}

export async function ensureCanAddCompanyAdmin(tenantId: string) {
  const summary = await getTenantSubscriptionSummary(tenantId);

  if (summary.usage.company_admins >= summary.limits.company_admins) {
    throw new Error(
      `Company Admin limit reached. Your ${summary.plan_name} plan allows ${summary.limits.company_admins} Company Admin users.`
    );
  }
}