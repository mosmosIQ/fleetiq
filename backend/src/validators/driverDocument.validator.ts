import { z } from "zod";

export const uploadDriverDocumentSchema = z.object({
  file_data: z
    .string()
    .max(7_000_000, "File must be 5 MB or smaller")
    .regex(
      /^data:(image\/(jpeg|jpg|png|webp)|application\/pdf);base64,/i,
      "Upload a JPG, PNG, WEBP image or a PDF file"
    ),
  file_name: z.string().max(255).optional()
});
