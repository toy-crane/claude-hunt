/**
 * Format a timestamptz ISO string to `YYYY-MM-DD` in the supplied
 * timezone, defaulting to Asia/Seoul. Returns an empty string when the
 * input is null/empty so callers can short-circuit rendering without
 * an extra guard.
 *
 * Why an explicit timezone: Postgres stores `timestamptz` in UTC and
 * the JS engine running this code may be UTC (Vercel functions) while
 * users live in KST. Slicing `iso.slice(0, 10)` would emit the UTC
 * date — for KST submissions between 00:00 and 09:00 that's the
 * previous day. Pinning the timezone avoids both that bug and a
 * server/client hydration mismatch (both renderers compute the same
 * string because the timezone is explicit).
 */
export function formatDateYmd(
  iso: string | null | undefined,
  options: { timeZone?: string } = {}
): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  // `en-CA` happens to emit `YYYY-MM-DD` natively — cheaper than a
  // formatToParts pass and stable across Node + browsers.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: options.timeZone ?? "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
