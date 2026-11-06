export const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/**
 * The month a "Happy New Month" post should name. From the 25th onward it
 * returns next month, otherwise the current one, using Lagos local time.
 */
export function newMonthName(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? 1);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? 1) - 1;
  return monthNames[day >= 25 ? (month + 1) % 12 : month];
}
