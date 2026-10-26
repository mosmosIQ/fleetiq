
import { z } from "zod";

export const createBatchSchema = z.object({
  direction: z.enum(["NORTHBOUND", "SOUTHBOUND"]),

  route_template_id: z.string().uuid(),

  loading_point: z.string().max(150).optional(),
  truck_handover_date: z.string().optional(),
  loading_date: z.string().optional(),
  tons: z.number().positive().optional(),
  release_date: z.string().optional(),
  notes: z.string().optional()
});
