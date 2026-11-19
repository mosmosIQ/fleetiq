
import app from "./app";
import { env } from "./config/env";
import { runDriverExpiryReminders } from "./services/driverExpiryReminder.service";

async function checkDriverExpiryReminders() {
  try {
    console.log("[Expiry] Starting reminder check...");

    const result = await runDriverExpiryReminders();

    console.log("[Expiry] Check completed:", {
      documentsDue: result.checked,
      notificationsCreated: result.created,
    });
  } catch (error) {
    console.error("[Expiry] Reminder check failed:", error);
  }
}

app.listen(env.PORT, () => {
  console.log(`FleetIQ API running on port ${env.PORT}`);

  // Run immediately when the backend starts.
  void checkDriverExpiryReminders();

  // Repeat every hour. A document is only reminded about once per day,
  // so this simply makes sure each day's reminders are sent early in the
  // day even if the server restarted or was asleep.
  setInterval(() => {
    void checkDriverExpiryReminders();
  }, 60 * 60 * 1000);
});
