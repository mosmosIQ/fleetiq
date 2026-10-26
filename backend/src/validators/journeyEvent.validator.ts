import { z } from "zod";

export const createJourneyEventSchema = z.object({
  checkpoint: z.string().max(100).optional().default(""),
  event_type: z.enum([
    "HANDOVER", "LOADING", "RELEASE", "ARRIVAL", "DEPARTURE",
    "FINAL_ARRIVAL", "FINAL_OFFLOADING"
  ]),
  location: z.string().max(150).optional(),
  occurred_at: z.string().optional(),
  notes: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  source: z.string().max(50).optional()
}).superRefine((data, ctx) => {
  const finalEvent = data.event_type === "FINAL_ARRIVAL" ||
    data.event_type === "FINAL_OFFLOADING";
  if (!finalEvent && data.checkpoint.trim().length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["checkpoint"],
      message: "Checkpoint must contain at least 2 characters for this event type"
    });
  }
});
