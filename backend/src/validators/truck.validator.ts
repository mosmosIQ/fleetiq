import { z } from "zod";
export const createTruckSchema = z.object({
  plate_number: z.string().min(2),
  truck_type: z.string().optional(),
  capacity: z.string().optional(),
  status: z.string().default("AVAILABLE")
});
