import dotenv from "dotenv";
import { db } from "../config/db";

dotenv.config();

/**
 * Wipes ALL business data (companies, drivers, trucks, trips, documents,
 * notifications, messages, etc.) so you can start afresh.
 *
 * KEPT: subscription_plans (STANDARD / PREMIUM) and SUPER_ADMIN user(s),
 * so you can still log in.
 *
 * Usage (from the backend folder):
 *   npm run db:reset -- --yes
 */
async function resetDatabase() {
  if (!process.argv.includes("--yes")) {
    console.log(
      "This will DELETE ALL data (companies, drivers, trucks, trips, documents...).\n" +
        "Super admin accounts and subscription plans are kept.\n" +
        "Run again with --yes to confirm:  npm run db:reset -- --yes"
    );
    await db.end();
    return;
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const superAdmins = await client.query(
      "SELECT * FROM users WHERE role = 'SUPER_ADMIN'"
    );

    const tables = await client.query(
      `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> 'subscription_plans'
      `
    );

    const list = tables.rows
      .map((row) => `"public"."${row.tablename}"`)
      .join(", ");

    await client.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);

    for (const admin of superAdmins.rows) {
      const columns = Object.keys(admin);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      await client.query(
        `INSERT INTO users (${columns.map((c) => `"${c}"`).join(", ")})
         VALUES (${placeholders})`,
        columns.map((c) => admin[c])
      );
    }

    await client.query("COMMIT");

    console.log(`Database cleared. ${tables.rowCount} tables emptied.`);
    console.log(`Super admin accounts kept: ${superAdmins.rowCount}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Reset failed, nothing was changed:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.end();
  }
}

void resetDatabase();
