import { DateTime } from "luxon";

/**
 * Display timezone for the absolute-date fallback. Postgres stores
 * `timestamptz` in UTC and the JS engine may be UTC (Vercel functions)
 * while users live in KST, so the calendar date is pinned to Asia/Seoul —
 * both for KST correctness and so server/client renders agree (no
 * hydration mismatch). Mirrors `shared/lib/format-date.ts`.
 */
const DISPLAY_ZONE = "Asia/Seoul";

/**
 * Days (floored) past which a timestamp is shown as an absolute date
 * rather than "N일 전". Beyond ~a month the relative form carries no
 * useful information (nobody back-computes "45일 전" into a date).
 */
const ABSOLUTE_AFTER_DAYS = 30;

/**
 * Elapsed time since `iso` as `{ days, hours, minutes }`, each floored and
 * clamped at zero so a future timestamp reads as "now" rather than going
 * negative. Returns null for null/unparseable input.
 */
function elapsedSince(
  iso: string | null,
  now: Date | undefined
): { days: number; hours: number; minutes: number } | null {
  if (!iso) {
    return null;
  }
  const then = DateTime.fromISO(iso);
  if (!then.isValid) {
    return null;
  }
  const reference = now ? DateTime.fromJSDate(now) : DateTime.now();
  const diff = reference.diff(then, ["days", "hours", "minutes"]).toObject();
  return {
    days: Math.max(0, Math.floor(diff.days ?? 0)),
    hours: Math.max(0, Math.floor(diff.hours ?? 0)),
    minutes: Math.max(0, Math.floor(diff.minutes ?? 0)),
  };
}

/**
 * Absolute calendar date in Asia/Seoul: "5월 12일" within the current
 * year, "2025년 5월 12일" for a prior year. No zero-padding, matching the
 * Korean month style in `shared/lib/month.ts`.
 */
function formatAbsoluteKo(iso: string, now: Date | undefined): string {
  const then = DateTime.fromISO(iso, { zone: "utc" }).setZone(DISPLAY_ZONE);
  const reference = (now ? DateTime.fromJSDate(now) : DateTime.now()).setZone(
    DISPLAY_ZONE
  );
  return then.year === reference.year
    ? then.toFormat("M월 d일")
    : then.toFormat("yyyy년 M월 d일");
}

/**
 * Relative time in Korean: "방금 전", "3분 전", "5시간 전", "12일 전".
 * Past `ABSOLUTE_AFTER_DAYS` it switches to an absolute KST date
 * ("5월 12일" / "2025년 5월 12일"). Returns "" for null/unparseable input
 * so callers can short-circuit rendering.
 *
 * The single source of truth for elapsed-time display across the board,
 * detail hero, winner spotlight, and comments.
 *
 * @param now Reference time — test-only injection. Components must omit it
 *   so the value defaults to the real current time.
 */
export function formatRelativeKo(iso: string | null, now?: Date): string {
  const elapsed = elapsedSince(iso, now);
  if (!elapsed) {
    return "";
  }
  if (elapsed.days > ABSOLUTE_AFTER_DAYS) {
    // `iso` is non-null here — elapsedSince returned a value.
    return formatAbsoluteKo(iso as string, now);
  }
  if (elapsed.days > 0) {
    return `${elapsed.days}일 전`;
  }
  if (elapsed.hours > 0) {
    return `${elapsed.hours}시간 전`;
  }
  if (elapsed.minutes > 0) {
    return `${elapsed.minutes}분 전`;
  }
  return "방금 전";
}
