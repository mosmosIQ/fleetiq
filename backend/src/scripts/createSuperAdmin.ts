import dotenv from "dotenv";
import { db } from "../config/db";
import { hashPassword } from "../utils/hashPassword";

dotenv.config();

async function createSuperAdmin() {
  const fullName = process.env.SUPER_ADMIN_NAME || "SaaS Owner";
  const email = process.env.SUPER_ADMIN_EMAIL || "admin@example.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "Admin@12345";

  const passwordHash = await hashPassword(password);

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
      NULL,
      $1,
      $2,
      $3,
      'SUPER_ADMIN',
      true
    )
    ON CONFLICT (email)
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      password_hash = EXCLUDED.password_hash,
      role = 'SUPER_ADMIN',
      is_active = true,
      updated_at = NOW()
    RETURNING id, full_name, email, role
    `,
    [fullName, email, passwordHash]
  );

  console.log("Super Admin created/updated successfully:");
  console.log(result.rows[0]);

  await db.end();
}

createSuperAdmin().catch(async (error) => {
  console.error("Failed to create Super Admin:", error);
  await db.end();
  process.exit(1);
});