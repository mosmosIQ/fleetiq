import { z } from "zod";
export const createTenantSchema = z.object({
  company_name: z.string().min(2),
  company_code: z.string().min(2).max(8),
  contact_email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  plan_name: z.enum(["STANDARD", "PREMIUM"]),
  admin_name: z.string().min(2),
  admin_email: z.string().email(),
  admin_password: z.string().min(6)
});
