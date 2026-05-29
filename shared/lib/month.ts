import { DateTime } from "luxon";

/**
 * Default display/bucketing timezone. The whole app reasons about
 * "this month" in KST, so month boundaries must be computed in Asia/Seoul
 * and only then projected onto the UTC instants stored in `timestamptz`
 * columns. Computing month boundaries in UTC (the previous bug) put the
 * first/last ~9 hours of every Korean month in the wrong bucket and made
 * the "N월" label disagree with the KST date shown on the same row.
 */
const DEFAULT_ZONE = "Asia/Seoul";

/** "YYYY-MM" for the month containing `date`, in the given timezone. */
export function monthSlug(date: Date, zone = DEFAULT_ZONE): string {
  return DateTime.fromJSDate(date).setZone(zone).toFormat("yyyy-MM");
}

/** "2026년 6월" for the month containing `date`, in the given timezone. */
export function monthLabel(date: Date, zone = DEFAULT_ZONE): string {
  const dt = DateTime.fromJSDate(date).setZone(zone);
  return `${dt.year}년 ${dt.month}월`;
}

/**
 * Half-open `[startUtc, endUtc)` UTC instants for the month containing
 * `date`, where the month boundary is taken in `zone`. Feed these straight
 * into `.gte("created_at", startUtc).lt("created_at", endUtc)` so the query
 * buckets rows by the KST calendar month.
 */
export function monthBoundsUtc(
  date: Date,
  zone = DEFAULT_ZONE
): { startUtc: string; endUtc: string } {
  const start = DateTime.fromJSDate(date).setZone(zone).startOf("month");
  const startUtc = start.toUTC().toISO();
  const endUtc = start.plus({ months: 1 }).toUTC().toISO();
  if (!(startUtc && endUtc)) {
    throw new Error(`monthBoundsUtc: invalid date ${date.toISOString()}`);
  }
  return { startUtc, endUtc };
}
