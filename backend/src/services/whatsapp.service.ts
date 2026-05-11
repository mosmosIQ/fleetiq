import { db } from "../config/db";
import { canSendMessage, incrementMessageUsage } from "./messageUsage.service";

export async function sendWhatsApp(
  tenantId: string,
  phoneNumber: string,
  message: string,
  options?: {
    tripId?: string;
    driverId?: string;
  }
) {
  const allowed = await canSendMessage(tenantId, "whatsapp");

  if (!allowed) {
    throw new Error("WhatsApp limit reached. Top-up required.");
  }

  // Placeholder mode for now.
  // Later this will be replaced with the real WhatsApp API call.
  console.log("Sending WhatsApp placeholder:", {
    to: phoneNumber,
    message
  });

  await db.query(
    `
    INSERT INTO whatsapp_messages (
      tenant_id,
      trip_id,
      driver_id,
      direction,
      phone_number,
      message_text,
      provider,
      status
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      'OUTBOUND',
      $4::varchar,
      $5::text,
      'WHATSAPP',
      'SENT'
    )
    `,
    [
      tenantId,
      options?.tripId || null,
      options?.driverId || null,
      phoneNumber,
      message
    ]
  );

  await incrementMessageUsage(tenantId, "whatsapp");

  return {
    sent: true
  };
}