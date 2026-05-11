export function normalizePhone(phone: string) {
  const cleaned = phone.replace(/\s+/g, "").replace(/-/g, "");
  if (cleaned.startsWith("0")) return `+255${cleaned.slice(1)}`;
  if (cleaned.startsWith("255")) return `+${cleaned}`;
  return cleaned;
}
