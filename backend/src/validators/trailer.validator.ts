import { z } from "zod";

export const createTrailerSchema = z.object({
  trailer_number: z.string().min(2).max(100),
  trailer_type: z.string().max(100).optional(),
  status: z
    .enum([
      "AVAILABLE",
      "UNDER_MAINTENANCE",
      "INACTIVE"
    ])
    .optional()
});

export const updateTrailerStatusSchema = z.object({
  status: z.enum([
    "AVAILABLE",
    "UNDER_MAINTENANCE",
    "INACTIVE"
  ])
});