export type TripStatus =
  | "ASSIGNED"
  | "STARTED"
  | "ON_ROUTE"
  | "DELAYED"
  | "BREAKDOWN"
  | "ARRIVED"
  | "COMPLETED";

export const smsOptionsByStatus: Record<string, Record<string, TripStatus>> = {
  ASSIGNED: { "1": "STARTED", "5": "DELAYED", "6": "BREAKDOWN" },
  STARTED: { "3": "ON_ROUTE", "5": "DELAYED", "6": "BREAKDOWN" },
  ON_ROUTE: { "4": "ARRIVED", "5": "DELAYED", "6": "BREAKDOWN" },
  DELAYED: { "3": "ON_ROUTE", "6": "BREAKDOWN" },
  BREAKDOWN: { "3": "ON_ROUTE", "5": "DELAYED" }
};

export function getNextStatus(currentStatus: TripStatus, option: string) {
  return smsOptionsByStatus[currentStatus]?.[option] ?? null;
}

export function formatNextOptions(publicTripCode: string, status: TripStatus) {
  const options = smsOptionsByStatus[status];
  if (!options) return "";
  return Object.entries(options)
    .map(([option, nextStatus]) => `${publicTripCode} ${option} = ${nextStatus.replace("_", " ")}`)
    .join("\n");
}
