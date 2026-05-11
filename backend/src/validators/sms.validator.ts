import { z } from "zod";
export const inboundSmsSchema = z.object({
  from: z.string().min(5),
  text: z.string().min(1),
  messageId: z.string().optional()
});
