import { z } from "zod";

export const changePasswordSchema = z.object({
  current_password: z.string().min(6),
  new_password: z.string().min(8)
});