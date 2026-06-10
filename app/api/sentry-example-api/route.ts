import { logger } from "@sentry/nextjs";

class SentryExampleAPIError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "SentryExampleAPIError";
  }
}

// A faulty API route to test Sentry's error monitoring
export function GET() {
  logger.info("Sentry example API called");
  throw new SentryExampleAPIError(
    "This error is raised on the backend called by the example page."
  );
}
