export interface ParsedSmsReply { publicTripCode: string; option: string; }

export function parseSmsReply(text: string): ParsedSmsReply | null {
  const parts = text.trim().toUpperCase().split(/\s+/);
  if (parts.length < 2) return null;
  return { publicTripCode: parts[0], option: parts[1] };
}
