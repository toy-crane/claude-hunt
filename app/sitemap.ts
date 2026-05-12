import { createAnonServerClient } from "@shared/api/supabase/anon-server";
import type { MetadataRoute } from "next";

export const revalidate = 3600;

const SITE_URL = "https://www.claude-hunt.com";

const STATIC_PATHS = ["/", "/privacy", "/terms"] as const;

// Fixed lastmod for static pages — using `new Date()` on every revalidation
// signals fake freshness to crawlers. Bump manually when a static page's
// content actually changes.
const STATIC_LAST_MODIFIED = new Date("2026-05-12T00:00:00Z");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: STATIC_LAST_MODIFIED,
  }));

  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, updated_at");

  if (error || !data) {
    return staticEntries;
  }

  const projectEntries: MetadataRoute.Sitemap = data.map((project) => ({
    url: `${SITE_URL}/projects/${project.id}`,
    lastModified: new Date(project.updated_at),
  }));

  return [...staticEntries, ...projectEntries];
}
