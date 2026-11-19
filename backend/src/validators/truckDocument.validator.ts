import { z } from "zod";

export const updateTruckInsuranceSchema = z.object({
  insurance_number: z.string().trim().max(100).optional().or(z.literal("")),
  insurance_expiry_date: z.string().optional().or(z.literal(""))
});
