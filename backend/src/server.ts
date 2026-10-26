
import app from "./app";
import { env } from "./config/env";
import { runDriverExpiryReminders } from "./services/driverExpiryReminder.service";

async function checkDriverExpiryReminders() {
  try {
    console.log("[Driver Expiry] Starting reminder check...");

    const result = await runDriverExpiryReminders();

    console.log("[Driver Expiry] Check completed:", {
      driversAndDocumentsDue: result.checked,
      notificationsCreated: result.created,
    });
  } catch (error) {
    console.error("[Driver Expiry] Reminder check failed:", error);
  }
}

app.listen(env.PORT, () => {
  console.log(`FleetIQ API running on port ${env.PORT}`);

  // Run immediately when the backend starts.
  void checkDriverExpiryReminders();

  // Repeat every 24 hours.
  setInterval(() => {
    void checkDriverExpiryReminders();
  }, 24 * 60 * 60 * 1000);
});
