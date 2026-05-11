import { db } from "../config/db";

function getCurrentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function getSuperAdminOverview() {
  const month = getCurrentMonthKey();

  const [
    tenantStats,
    planStats,
    fleetStats,
    messageStats,
    recentCompanies
  ] = await Promise.all([
    db.query(
      `
      SELECT
        COUNT(*)::int AS total_companies,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active_companies,
        COUNT(*) FILTER (WHERE status = 'SUSPENDED')::int AS suspended_companies,
        COUNT(*) FILTER (WHERE status = 'ARCHIVED')::int AS archived_companies
      FROM tenants
      `
    ),

    db.query(
      `
      SELECT
        sp.name AS plan_name,
        COUNT(ts.id)::int AS company_count
      FROM subscription_plans sp
      LEFT JOIN tenant_subscriptions ts
        ON ts.plan_id = sp.id
      GROUP BY sp.name
      ORDER BY sp.name
      `
    ),

    db.query(
      `
      SELECT
        (SELECT COUNT(*)::int FROM trucks) AS total_trucks,
        (SELECT COUNT(*)::int FROM drivers) AS total_drivers,
        (SELECT COUNT(*)::int FROM trips) AS total_trips,
        (SELECT COUNT(*)::int FROM trips WHERE status <> 'COMPLETED') AS active_trips,
        (SELECT COUNT(*)::int FROM trips WHERE status = 'COMPLETED') AS completed_trips,
        (SELECT COUNT(*)::int FROM trips WHERE status = 'DELAYED') AS delayed_trips,
        (SELECT COUNT(*)::int FROM trips WHERE status = 'BREAKDOWN') AS breakdown_trips
      `
    ),

    db.query(
      `
      SELECT
        COALESCE(SUM(sms_sent), 0)::int AS sms_sent,
        COALESCE(SUM(whatsapp_sent), 0)::int AS whatsapp_sent
      FROM message_usage
      WHERE month = $1::varchar
      `,
      [month]
    ),

    db.query(
      `
      SELECT
        t.id,
        t.company_name,
        t.company_code,
        t.contact_email,
        t.phone,
        t.status,
        t.created_at,
        sp.name AS plan_name
      FROM tenants t
      LEFT JOIN LATERAL (
        SELECT *
        FROM tenant_subscriptions ts
        WHERE ts.tenant_id = t.id
        ORDER BY ts.created_at DESC
        LIMIT 1
      ) ts ON true
      LEFT JOIN subscription_plans sp
        ON sp.id = ts.plan_id
      ORDER BY t.created_at DESC
      LIMIT 10
      `
    )
  ]);

  const planRows = planStats.rows;

  return {
    month,
    companies: tenantStats.rows[0],
    plans: {
      standard:
        planRows.find((row) => row.plan_name === "STANDARD")?.company_count ||
        0,
      premium:
        planRows.find((row) => row.plan_name === "PREMIUM")?.company_count ||
        0
    },
    fleet: fleetStats.rows[0],
    messages: messageStats.rows[0],
    recent_companies: recentCompanies.rows
  };
}