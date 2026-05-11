import { Pool } from "pg";
import { env } from "./env";

const shouldUseSsl =
  env.NODE_ENV === "production" ||
  env.DATABASE_URL.includes("sslmode=require") ||
  env.DATABASE_URL.includes("neon.tech");

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: shouldUseSsl
    ? {
        rejectUnauthorized: false
      }
    : undefined
});