import type { MetadataRoute } from "next";

const SITE_URL = "https://www.claude-hunt.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/onboarding",
        "/settings",
        "/projects/new",
        "/projects/*/edit",
        "/auth/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
