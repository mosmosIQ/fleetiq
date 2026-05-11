import { z } from "zod";

export const createTripSchema = z.object({
  truck_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  route_from: z.string().min(2),
  route_to: z.string().min(2),
  cargo_description: z.string().optional(),
  planned_start_at: z.string().optional(),
  expected_arrival_at: z.string().optional()
});

export const updateTripStatusSchema = z.object({
  status: z.enum([
    "STARTED",
    "ON_ROUTE",
    "ARRIVED",
    "DELAYED",
    "BREAKDOWN"
  ])
});