import { DateTime } from "luxon";

interface FormatStrings {
  day: (n: number) => string;
  hour: (n: number) => string;
  minute: (n: number) => string;
  now: string;
}

const KO_LONG: FormatStrings = {
  day: (n) => `${n}일 전`,
  hour: (n) => `${n}시간 전`,
  minute: (n) => `${n}분 전`,
  now: "방금",
};

const SHORT: FormatStrings = {
  day: (n) => `${n}d`,
  hour: (n) => `${n}h`,
  minute: (n) => `${n}m`,
  now: "방금",
};

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

function format(iso: string | null, strings: FormatStrings): string {
  const elapsed = elapsedSince(iso, undefined);
  if (!elapsed) {
    return "";
  }
  if (elapsed.days > 0) {
    return strings.day(elapsed.days);
  }
  if (elapsed.hours > 0) {
    return strings.hour(elapsed.hours);
  }
  if (elapsed.minutes > 0) {
    return strings.minute(elapsed.minutes);
  }
  return strings.now;
}

/** "1일 전", "2시간 전", "3분 전", "방금". */
export function formatRelativeKo(iso: string | null): string {
  return format(iso, KO_LONG);
}

/** "1d", "2h", "3m", "방금". Compact terminal-style for the board. */
export function formatRelativeShort(iso: string | null): string {
  return format(iso, SHORT);
}

/**
 * Whole days between `iso` and `now` (default: current time), floored and
 * never negative. Shared day-count primitive — used by the winner
 * spotlight's "Nd ago" line.
 */
export function daysSince(iso: string, now = new Date()): number {
  return elapsedSince(iso, now)?.days ?? 0;
}
