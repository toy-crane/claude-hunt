const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

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

function format(iso: string | null, strings: FormatStrings): string {
  if (!iso) {
    return "";
  }
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return "";
  }
  const diff = Math.max(0, Date.now() - then);
  const days = Math.floor(diff / DAY_MS);
  if (days > 0) {
    return strings.day(days);
  }
  const hours = Math.floor(diff / HOUR_MS);
  if (hours > 0) {
    return strings.hour(hours);
  }
  const mins = Math.floor(diff / MINUTE_MS);
  if (mins > 0) {
    return strings.minute(mins);
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
