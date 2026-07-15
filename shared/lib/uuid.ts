/**
 * Matches a canonical RFC 4122 UUID (8-4-4-4-12 hex, any version/variant),
 * case-insensitively. Deliberately strict: no surrounding whitespace and no
 * stray trailing characters, so a malformed path param like
 * `74394177-3371-4cfe-8ba8-a4cefb884cd5%5C` (a trailing backslash) is rejected
 * before it ever reaches a Postgres `uuid` cast.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns true only when `value` is a syntactically valid UUID. Use this to
 * short-circuit reads keyed on a `uuid` column so an invalid id resolves to
 * "not found" instead of surfacing Postgres error `22P02`.
 */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
