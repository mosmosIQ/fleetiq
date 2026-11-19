import { z } from "zod";

const optText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const optDate = z.string().optional().or(z.literal(""));

const truckData = z.object({
  plate_number: z.string().trim().min(2).max(30).optional(),
  truck_type: optText(100),
  capacity: optText(100),
  status: z
    .enum(["AVAILABLE", "UNDER_MAINTENANCE", "ACCIDENTED", "INACTIVE"])
    .optional()
});

const trailerData = z.object({
  trailer_number: z.string().trim().max(100).optional(),
  trailer_type: optText(100),
  trailer_model: optText(100),
  status: z
    .enum(["AVAILABLE", "UNDER_MAINTENANCE", "INACTIVE"])
    .optional()
});

const driverData = z.object({
  full_name: z.string().trim().max(150).optional(),
  phone_number: z.string().trim().max(30).optional(),
  passport_number: optText(100),
  license_number: optText(100),
  license_expiry_date: optDate,
  chemical_certificate_number: optText(100),
  chemical_certificate_expiry_date: optDate,
  joining_date: optDate,
  leaving_date: optDate
});

const action = z.enum([
  "keep",
  "unlink",
  "link_existing",
  "create_new"
]);

const trailerInstruction = z.object({
  action,
  id: z.string().uuid().optional(),
  data: trailerData.optional()
});

const driverInstruction = z.object({
  action,
  id: z.string().uuid().optional(),
  data: driverData.optional()
});

export const createFleetUnitSchema = z.object({
  truck: truckData.extend({
    plate_number: z.string().trim().min(2).max(30)
  }),
  trailer: trailerInstruction.optional(),
  driver: driverInstruction.optional()
});

export const updateFleetUnitSchema = z.object({
  truck: truckData.omit({ status: true }).optional(),
  trailer: trailerInstruction.optional(),
  driver: driverInstruction.optional()
});
