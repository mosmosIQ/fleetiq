# SMS Flow

Provider: Beem Africa  
SMS type: SMS Shortcode - Toll Free - Shared

Because the shortcode is shared, driver replies must include:

```text
PUBLIC_TRIP_CODE OPTION_NUMBER
```

Examples:

```text
SIM-0102 1 = Start Trip
SIM-0102 3 = On Route
SIM-0102 4 = Arrived
SIM-0102 5 = Delayed
SIM-0102 6 = Breakdown
```

Flow:
1. Company Admin creates a trip.
2. Backend creates public trip code like `SIM-0102`.
3. Backend sends SMS through Beem.
4. Driver replies using the same SMS thread.
5. Backend validates phone number, trip code, tenant, driver assignment, and status transition.
6. Backend updates trip and logs the update.
7. Backend sends confirmation + next valid options.
8. If no reply in 30–45 minutes, WhatsApp fallback is sent.
9. If still no reply, Company Admin gets dashboard alert.
