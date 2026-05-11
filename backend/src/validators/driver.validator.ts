import { z } from "zod";
export const createDriverSchema = z.object({
  full_name: z.string().min(2),
  phone_number: z.string().min(5),
  license_number: z.string().optional(),
  license_expiry_date: z.string().optional()
});
