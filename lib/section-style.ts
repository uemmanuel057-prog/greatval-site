/**
 * Spacing for a section. On the home screen sections are bands separated by
 * borders; on their own page they sit directly under the header with no band.
 */
export function sectionSpacing(
  page: boolean | undefined,
  tone: "plain" | "raised" = "plain",
): string {
  if (page) return "pb-20 pt-14 sm:pb-28 sm:pt-20";
  return `border-b border-line py-20 sm:py-28 ${tone === "raised" ? "bg-raised" : ""}`;
}
