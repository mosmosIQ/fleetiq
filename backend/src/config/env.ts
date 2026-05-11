import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.string().default("development"),

  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default("postgres"),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),

  JWT_SECRET: z.string().min(10),
  FRONTEND_URL: z.string().default("http://localhost:5173"),

  BEEM_API_KEY: z.string().optional(),
  BEEM_SECRET_KEY: z.string().optional(),
  BEEM_SOURCE_ADDRESS: z.string().optional(),

  WHATSAPP_API_KEY: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional()
});

export const env = envSchema.parse(process.env);