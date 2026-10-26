
import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const optionalDate = z.string().optional().or(z.literal(""));

export const createDriverSchema = z.object({
  full_name: z.string().trim().min(2).max(150),
  phone_number: z.string().trim().min(5).max(30),

  passport_number: optionalText(100),

  license_number: optionalText(100),
  license_expiry_date: optionalDate,

  chemical_certificate_number: optionalText(100),
  chemical_certificate_expiry_date: optionalDate,

  // Image is sent as a data URL and stored in documents.file_url.
  chemical_certificate_image: z
    .string()
    .max(7_000_000, "Chemical certificate image must be 5 MB or smaller")
    .regex(
      /^data:image\/(jpeg|jpg|png|webp);base64,/,
      "Upload a JPG, PNG, or WEBP image"
    )
    .optional()
    .or(z.literal(""))
});
