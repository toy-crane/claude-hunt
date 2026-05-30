import type { z } from "zod";

export function getZodErrorMessage(
  error: z.ZodError,
  fallback: string
): string {
  return error.issues.at(0)?.message ?? fallback;
}

/**
 * Reduce a ZodError into a `{ field: message }` record keyed by the
 * first path segment, so forms can render each message next to its own
 * field. First issue wins per field; issues without a string path
 * segment (e.g. object-level refinements) are skipped — callers that
 * need those should fall back to {@link getZodErrorMessage}.
 */
export function getZodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}
