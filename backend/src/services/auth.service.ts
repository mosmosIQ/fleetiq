import { db } from "../config/db";
import { comparePassword, hashPassword } from "../utils/hashPassword";
import { generateToken } from "../utils/generateToken";

export async function login(email: string, password: string) {
  const result = await db.query(
    `SELECT id, tenant_id, email, password_hash, role, is_active FROM users WHERE email = $1`,
    [email]
  );

  const user = result.rows[0];
  if (!user || !user.is_active) throw new Error("Invalid login details");

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) throw new Error("Invalid login details");

  const token = generateToken({
    id: user.id,
    tenant_id: user.tenant_id,
    role: user.role,
    email: user.email
  });

  return { token, user: { id: user.id, tenant_id: user.tenant_id, email: user.email, role: user.role } };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const userResult = await db.query(
    `
    SELECT id, password_hash
    FROM users
    WHERE id = $1::uuid
      AND is_active = true
    LIMIT 1
    `,
    [userId]
  );

  const user = userResult.rows[0];

  if (!user) {
    throw new Error("User not found");
  }

  const currentPasswordIsValid = await comparePassword(
    currentPassword,
    user.password_hash
  );

  if (!currentPasswordIsValid) {
    throw new Error("Current password is incorrect");
  }

  const newPasswordHash = await hashPassword(newPassword);

  await db.query(
    `
    UPDATE users
    SET password_hash = $1::text,
        updated_at = NOW()
    WHERE id = $2::uuid
    `,
    [newPasswordHash, userId]
  );

  return {
    message: "Password changed successfully"
  };
}
