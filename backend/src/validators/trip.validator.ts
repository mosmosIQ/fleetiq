
import { z } from "zod";

export const createTripSchema = z.object({
  truck_id: z.string().uuid("Invalid truck ID"),
  driver_id: z.string().uuid("Invalid driver ID"),

  batch_id: z.string().uuid("Invalid batch ID").optional().nullable(),
  trailer_id: z.string().uuid("Invalid trailer ID").optional().nullable(),

  route_from: z.string().trim().min(1, "Starting location is required"),
  route_to: z.string().trim().min(1, "Destination is required"),

  cargo_description: z.string().optional().nullable().or(z.literal("")),

  planned_start_at: z.string().optional().nullable().or(z.literal("")),
  expected_arrival_at: z.string().optional().nullable().or(z.literal(""))
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
