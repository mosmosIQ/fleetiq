import app from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(`FleetIQ API running on port ${env.PORT}`);
});