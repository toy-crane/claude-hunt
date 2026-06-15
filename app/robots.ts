import { SITE_URL } from "@shared/config/site";
import type { MetadataRoute } from "next";

// Auth-only routes (/login, /onboarding, /settings, /projects/new,
// /projects/*/edit, /auth/*) are kept out of search via a per-page
// `noindex` tag (NOINDEX_METADATA), not a robots.txt disallow. A disallow
// blocks crawling, so Googlebot never reads the noindex tag and the page
// can still get indexed (and triggers GSC "blocked by robots.txt" alerts).
// Allowing the crawl lets Googlebot read noindex and drop the page cleanly.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
