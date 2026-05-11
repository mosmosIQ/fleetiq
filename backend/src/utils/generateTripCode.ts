export function generatePublicTripCode(companyCode: string, tripNumber: number) {
  const cleanCode = companyCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `${cleanCode}-${String(tripNumber).padStart(4, "0")}`;
}
