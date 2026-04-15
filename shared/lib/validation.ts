import type { z } from "zod";

export function getZodErrorMessage(
  error: z.ZodError,
  fallback: string
): string {
  return error.issues.at(0)?.message ?? fallback;
}
