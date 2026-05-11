import { db } from "../config/db";
import { hashPassword } from "../utils/hashPassword";

export async function createTenantWithAdmin(input: {
  company_name: string;
  company_code: string;
  contact_email: string;
  phone?: string;
  address?: string;
  plan_name: "STANDARD" | "PREMIUM";
  admin_name: string;
  admin_email: string;
  admin_password: string;
}) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const tenantResult = await client.query(
      `INSERT INTO tenants (company_name, company_code, contact_email, phone, address, status)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
       RETURNING *`,
      [
        input.company_name,
        input.company_code.toUpperCase(),
        input.contact_email,
        input.phone,
        input.address
      ]
    );

    const tenant = tenantResult.rows[0];

    const planResult = await client.query(
      `SELECT id FROM subscription_plans WHERE name = $1`,
      [input.plan_name]
    );

    if (!planResult.rows[0]) {
      throw new Error("Subscription plan not found. Run the seed file first.");
    }

    await client.query(
      `INSERT INTO tenant_subscriptions
       (tenant_id, plan_id, status, current_period_start, current_period_end)
       VALUES ($1, $2, 'ACTIVE', NOW(), NOW() + INTERVAL '30 days')`,
      [tenant.id, planResult.rows[0].id]
    );

    const passwordHash = await hashPassword(input.admin_password);

    await client.query(
      `INSERT INTO users (tenant_id, full_name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, 'COMPANY_ADMIN', true)`,
      [tenant.id, input.admin_name, input.admin_email, passwordHash]
    );

    await client.query("COMMIT");

    return tenant;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listTenants() {
  const result = await db.query(
    `
    SELECT
      t.id,
      t.company_name,
      t.company_code,
      t.contact_email,
      t.phone,
      t.address,
      t.status,
      t.created_at,
      sp.name AS plan_name,
      ts.status AS subscription_status,
      ts.current_period_start,
      ts.current_period_end
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
    `
  );

  return result.rows;
}

export async function updateTenantPlan(
  tenantId: string,
  planName: "STANDARD" | "PREMIUM"
) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const planResult = await client.query(
      `
      SELECT id, name
      FROM subscription_plans
      WHERE name = $1::varchar
      LIMIT 1
      `,
      [planName]
    );

    const plan = planResult.rows[0];

    if (!plan) {
      throw new Error("Plan not found");
    }

    const subscriptionResult = await client.query(
      `
      SELECT id
      FROM tenant_subscriptions
      WHERE tenant_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [tenantId]
    );

    const subscription = subscriptionResult.rows[0];

    if (!subscription) {
      throw new Error("Subscription not found for this company");
    }

    const updatedResult = await client.query(
      `
      UPDATE tenant_subscriptions
      SET plan_id = $1::uuid
      WHERE id = $2::uuid
      RETURNING *
      `,
      [plan.id, subscription.id]
    );

    await client.query(
      `
      INSERT INTO audit_logs (
        tenant_id,
        action,
        entity_type,
        entity_id,
        details
      )
      VALUES ($1::uuid, 'TENANT_PLAN_UPDATED', 'tenant', $1::uuid, $2::jsonb)
      `,
      [
        tenantId,
        JSON.stringify({
          new_plan: plan.name
        })
      ]
    );

    await client.query("COMMIT");

    return updatedResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateTenantStatus(
  tenantId: string,
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED"
) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const tenantResult = await client.query(
      `
      UPDATE tenants
      SET status = $1::varchar,
          updated_at = NOW()
      WHERE id = $2::uuid
      RETURNING *
      `,
      [status, tenantId]
    );

    const tenant = tenantResult.rows[0];

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const subscriptionStatus =
      status === "ACTIVE" ? "ACTIVE" : "SUSPENDED";

    await client.query(
      `
      UPDATE tenant_subscriptions
      SET status = $1::varchar
      WHERE tenant_id = $2::uuid
      `,
      [subscriptionStatus, tenantId]
    );

    await client.query(
      `
      INSERT INTO audit_logs (
        tenant_id,
        action,
        entity_type,
        entity_id,
        details
      )
      VALUES ($1::uuid, 'TENANT_STATUS_UPDATED', 'tenant', $1::uuid, $2::jsonb)
      `,
      [
        tenantId,
        JSON.stringify({
          new_status: status
        })
      ]
    );

    await client.query("COMMIT");

    return tenant;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}