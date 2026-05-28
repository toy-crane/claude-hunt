/**
 * Sanitize a `?next=<path>` query value into a same-origin path or a
 * fallback. Accepts the raw shape Next.js delivers (string, string[],
 * or undefined when a key is duplicated like `?next=a&next=b`) and
 * normalizes to a single safe path.
 *
 * Returns the fallback when:
 * - The value is missing / array (we don't know which to pick).
 * - The value does not start with `/` (cross-origin or relative).
 * - The value starts with `//` (protocol-relative — browser would
 *   interpret it as the cross-origin host `//evil.com/`).
 *
 * The browser path component check is intentionally strict: we want
 * an explicit allow-list for the redirect target, not URL parsing
 * heuristics. Callers pass the fallback so the helper stays
 * destination-agnostic.
 */
export function sanitizeNextPath(
  raw: string | string[] | undefined,
  fallback: string
): string {
  if (typeof raw !== "string") {
    return fallback;
  }
  if (!raw.startsWith("/")) {
    return fallback;
  }
  if (raw.startsWith("//")) {
    return fallback;
  }
  return raw;
}
