/** Days between `createdAt` and `now`, floored. */
export function daysAgo(createdAt: string, now = new Date()): number {
  const created = new Date(createdAt).getTime();
  const diffMs = now.getTime() - created;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/** "YYYY-MM" for the current month — used in the terminal prompt. */
export function currentMonthSlug(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** "2026년 5월" for the visible hero lead. */
export function currentMonthLabel(now = new Date()): string {
  return `${now.getUTCFullYear()}년 ${now.getUTCMonth() + 1}월`;
}
