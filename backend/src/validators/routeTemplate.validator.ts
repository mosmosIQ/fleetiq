
import { z } from "zod";

const checkpointSchema = z
  .string()
  .trim()
  .min(2, "Each checkpoint must contain at least 2 characters")
  .max(150, "Checkpoint names cannot exceed 150 characters")
  .transform((checkpoint) =>
    checkpoint.replace(/\s+/g, " ")
  );

export const createRouteTemplateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Route template name must contain at least 2 characters")
      .max(150, "Route template names cannot exceed 150 characters"),

    direction: z.enum(["NORTHBOUND", "SOUTHBOUND"]),

    checkpoints: z
      .array(checkpointSchema)
      .min(2, "Add at least two checkpoints")
      .max(100, "A route can contain up to 100 checkpoints")
  })
  .superRefine((data, ctx) => {
    const normalized = data.checkpoints.map((checkpoint) =>
      checkpoint.toLocaleLowerCase()
    );

    if (new Set(normalized).size !== normalized.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["checkpoints"],
        message: "Checkpoint names must be unique within a route"
      });
    }
  });

export const updateRouteTemplateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Route template name must contain at least 2 characters")
      .max(150, "Route template names cannot exceed 150 characters")
      .optional(),

    checkpoints: z
      .array(checkpointSchema)
      .min(2, "Add at least two checkpoints")
      .max(100, "A route can contain up to 100 checkpoints")
      .optional(),

    is_active: z.boolean().optional()
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least one field to update"
      });
    }

    if (data.checkpoints) {
      const normalized = data.checkpoints.map((checkpoint) =>
        checkpoint.toLocaleLowerCase()
      );

      if (new Set(normalized).size !== normalized.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["checkpoints"],
          message: "Checkpoint names must be unique within a route"
        });
      }
    }
  });
