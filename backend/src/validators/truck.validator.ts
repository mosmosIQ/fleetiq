
import { z } from "zod";

const manageableTruckStatusSchema = z.enum([
  "AVAILABLE",
  "UNDER_MAINTENANCE",
  "ACCIDENTED",
  "INACTIVE"
]);

export const createTruckSchema = z.object({
  plate_number: z.string().trim().min(2).max(30),
  truck_type: z.string().trim().optional(),
  capacity: z.string().trim().optional(),
  status: manageableTruckStatusSchema.default("AVAILABLE")
});

export const updateTruckStatusSchema = z.object({
  status: manageableTruckStatusSchema
});
