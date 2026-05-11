import { db } from "../config/db";
import { hashPassword } from "../utils/hashPassword";
import { ensureCanAddCompanyAdmin } from "./subscription.service";

export async function listCompanyUsers(tenantId: string) {
  const result = await db.query(
    `
    SELECT
      id,
      full_name,
      email,
      role,
      is_active,
      created_at
    FROM users
    WHERE tenant_id = $1::uuid
      AND role = 'COMPANY_ADMIN'
    ORDER BY created_at DESC
    `,
    [tenantId]
  );

  return result.rows;
}

export async function createCompanyAdmin(
  tenantId: string,
  input: {
    full_name: string;
    email: string;
    password: string;
  }
) {
  await ensureCanAddCompanyAdmin(tenantId);

  const passwordHash = await hashPassword(input.password);

  const result = await db.query(
    `
    INSERT INTO users (
      tenant_id,
      full_name,
      email,
      password_hash,
      role,
      is_active
    )
    VALUES (
      $1::uuid,
      $2::varchar,
      $3::varchar,
      $4::text,
      'COMPANY_ADMIN',
      true
    )
    RETURNING id, full_name, email, role, is_active, created_at
    `,
    [tenantId, input.full_name, input.email, passwordHash]
  );

  return result.rows[0];
}

export async function deactivateCompanyUser(
  tenantId: string,
  userId: string,
  currentUserId: string
) {
  if (userId === currentUserId) {
    throw new Error("You cannot deactivate your own account");
  }

  const result = await db.query(
    `
    UPDATE users
    SET is_active = false,
        updated_at = NOW()
    WHERE id = $1::uuid
      AND tenant_id = $2::uuid
      AND role = 'COMPANY_ADMIN'
    RETURNING id, full_name, email, role, is_active, created_at
    `,
    [userId, tenantId]
  );

  if (!result.rows[0]) {
    throw new Error("User not found");
  }

  return result.rows[0];
}

export async function reactivateCompanyUser(
  tenantId: string,
  userId: string
) {
  await ensureCanAddCompanyAdmin(tenantId);

  const result = await db.query(
    `
    UPDATE users
    SET is_active = true,
        updated_at = NOW()
    WHERE id = $1::uuid
      AND tenant_id = $2::uuid
      AND role = 'COMPANY_ADMIN'
    RETURNING id, full_name, email, role, is_active, created_at
    `,
    [userId, tenantId]
  );

  if (!result.rows[0]) {
    throw new Error("User not found");
  }

  return result.rows[0];
}