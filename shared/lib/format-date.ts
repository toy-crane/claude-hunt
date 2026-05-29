import { DateTime } from "luxon";

/**
 * Format a timestamptz ISO string to `YYYY-MM-DD` in the supplied
 * timezone, defaulting to Asia/Seoul. Returns an empty string when the
 * input is null/empty/unparseable so callers can short-circuit rendering
 * without an extra guard.
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
  const dt = DateTime.fromISO(iso, { zone: "utc" });
  if (!dt.isValid) {
    return "";
  }
  return dt.setZone(options.timeZone ?? "Asia/Seoul").toFormat("yyyy-MM-dd");
}
