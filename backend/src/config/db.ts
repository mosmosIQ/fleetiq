import { Pool } from "pg";
import { env } from "./env";

export const db = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME
});

export async function testDatabaseConnection() {
  const result = await db.query("SELECT NOW()");
  return result.rows[0];
}