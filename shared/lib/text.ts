// Matches a run of newlines plus any whitespace hugging it, so it can be
// collapsed to a single space. Module-scoped so the literal is compiled once.
const NEWLINE_RUNS = /\s*\n+\s*/g;

/**
 * Trims a string and returns `undefined` when nothing is left. Used to
 * normalize optional form fields (empty input → omitted, never `""`).
 */
export function blankToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Collapses every newline run (and the whitespace around it) into a single
 * space, then trims. Turns a pasted multi-line value into one line.
 */
export function flattenToSingleLine(value: string): string {
  return value.replace(NEWLINE_RUNS, " ").trim();
}
