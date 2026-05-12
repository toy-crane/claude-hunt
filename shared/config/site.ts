import type { Metadata } from "next";

export const SITE_URL = "https://www.claude-hunt.com";

export const NOINDEX_METADATA = {
  robots: { index: false, follow: false },
} as const satisfies Pick<Metadata, "robots">;
