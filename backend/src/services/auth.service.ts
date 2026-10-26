
import { db } from "../config/db";

import {
  comparePassword,
  hashPassword
} from "../utils/hashPassword";

import { generateToken } from "../utils/generateToken";

function generateCompanyCode(companyName: string) {
  const cleaned = companyName
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6);

  const randomNumber = Math.floor(1000 + Math.random() * 9000);

  return `${cleaned || "COMP"}${randomNumber}`.slice(0, 10);
}

export async function register(
  companyName: string,
  email: string,
  password: string
) {
  if (!companyName || !email || !password) {
    throw new Error(
      "Company name, email and password are required"
    );
  }

  if (password.length < 6) {
    throw new Error(
      "Password must be at least 6 characters"
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCompanyName = companyName.trim();

  const existingUser = await db.query(
    `SELECT id FROM users WHERE email = $1`,
    [normalizedEmail]
  );

  if (existingUser.rows.length > 0) {
    throw new Error(
      "An account with this email already exists"
    );
  }

  const passwordHash = await hashPassword(password);

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Generate unique company code
    let companyCode =
      generateCompanyCode(normalizedCompanyName);

    let codeExists = true;

    while (codeExists) {
      const codeResult = await client.query(
        `SELECT id FROM tenants WHERE company_code = $1`,
        [companyCode]
      );

      if (codeResult.rows.length === 0) {
        codeExists = false;
      } else {
        companyCode =
          generateCompanyCode(normalizedCompanyName);
      }
    }

    // Create company / tenant
    const tenantResult = await client.query(
      `
        INSERT INTO tenants (
          company_name,
          company_code,
          contact_email,
          status,
          communication_mode
        )
        VALUES (
          $1,
          $2,
          $3,
          'ACTIVE',
          'SMS_PRIMARY'
        )
        RETURNING id, company_name, company_code
      `,
      [
        normalizedCompanyName,
        companyCode,
        normalizedEmail
      ]
    );

    const tenant = tenantResult.rows[0];

    // Create Company Admin
    const userResult = await client.query(
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
          $1,
          $2,
          $3,
          $4,
          'COMPANY_ADMIN',
          true
        )
        RETURNING
          id,
          tenant_id,
          full_name,
          email,
          role,
          is_active
      `,
      [
        tenant.id,
        normalizedCompanyName,
        normalizedEmail,
        passwordHash
      ]
    );

    const user = userResult.rows[0];

    // Create default STANDARD subscription
    const standardPlanId =
      "6cfcadb0-2cd9-43e9-8dc9-eff0e5d07dcb";

    await client.query(
      `
        INSERT INTO tenant_subscriptions (
          tenant_id,
          plan_id,
          status,
          current_period_start,
          current_period_end,
          grace_period_ends_at,
          cancelled_at
        )
        VALUES (
          $1,
          $2,
          'PENDING',
          NOW(),
          NOW() + INTERVAL '1 month',
          NULL,
          NULL
        )
      `,
      [
        tenant.id,
        standardPlanId
      ]
    );

    // Commit everything together
    await client.query("COMMIT");

    return {
      message: "Company account created successfully",

      tenant: {
        id: tenant.id,
        company_name: tenant.company_name,
        company_code: tenant.company_code
      },

      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active
      }
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function login(
  email: string,
  password: string
) {
  const normalizedEmail =
    email.trim().toLowerCase();

  const result = await db.query(
    `
      SELECT
        id,
        tenant_id,
        email,
        password_hash,
        role,
        is_active
      FROM users
      WHERE email = $1
    `,
    [normalizedEmail]
  );

  const user = result.rows[0];

  if (!user || !user.is_active) {
    throw new Error(
      "Invalid login details"
    );
  }

  const ok = await comparePassword(
    password,
    user.password_hash
  );

  if (!ok) {
    throw new Error(
      "Invalid login details"
    );
  }

  const token = generateToken({
    id: user.id,
    tenant_id: user.tenant_id,
    role: user.role,
    email: user.email
  });

  return {
    token,

    user: {
      id: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      role: user.role
    }
  };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const userResult = await db.query(
    `
      SELECT
        id,
        password_hash
      FROM users
      WHERE id = $1::uuid
        AND is_active = true
      LIMIT 1
    `,
    [userId]
  );

  const user = userResult.rows[0];

  if (!user) {
    throw new Error(
      "User not found"
    );
  }

  const currentPasswordIsValid =
    await comparePassword(
      currentPassword,
      user.password_hash
    );

  if (!currentPasswordIsValid) {
    throw new Error(
      "Current password is incorrect"
    );
  }

  const newPasswordHash =
    await hashPassword(newPassword);

  await db.query(
    `
      UPDATE users
      SET
        password_hash = $1::text,
        updated_at = NOW()
      WHERE id = $2::uuid
    `,
    [
      newPasswordHash,
      userId
    ]
  );

  return {
    message: "Password changed successfully"
  };
}

