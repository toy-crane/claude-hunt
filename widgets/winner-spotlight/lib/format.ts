/** "YYYY-MM" derived from a Date's UTC year/month. */
export function monthSlugFromDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** "2026년 5월" derived from a Date's UTC year/month. */
export function monthLabelFromDate(date: Date): string {
  return `${date.getUTCFullYear()}년 ${date.getUTCMonth() + 1}월`;
}

/** "YYYY-MM" for the current UTC month — used in the terminal prompt. */
export function currentMonthSlug(now = new Date()): string {
  return monthSlugFromDate(now);
}

/** "2026년 5월" for the visible hero lead. */
export function currentMonthLabel(now = new Date()): string {
  return monthLabelFromDate(now);
}
