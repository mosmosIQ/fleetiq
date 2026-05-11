import { z } from "zod";

export const createCompanyAdminSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});