import { createAnonServerClient } from "@shared/api/supabase/anon-server";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { SITE_URL } from "@shared/config/site";
import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

const STATIC_PATHS = ["/", "/projects", "/privacy", "/terms"] as const;

// Fixed lastmod for static pages — using `new Date()` on every revalidation
// signals fake freshness to crawlers. Bump manually when a static page's
// content actually changes.
const STATIC_LAST_MODIFIED = new Date("2026-05-28T00:00:00Z");

/**
 * Project ids + lastmod for the sitemap. Cached (`projects` tag, hourly
 * cacheLife) so the sitemap doesn't re-query on every crawl; project
 * insert/update/delete busts it via `updateTag(PROJECTS)`.
 */
async function fetchSitemapProjects(): Promise<
  { id: string; updated_at: string }[]
> {
  "use cache";
  cacheTag(CACHE_TAGS.PROJECTS);
  cacheLife("hours");

  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, updated_at");

  if (error || !data) {
    return [];
  }
  return data;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: STATIC_LAST_MODIFIED,
  }));

  const projects = await fetchSitemapProjects();
  const projectEntries: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${SITE_URL}/projects/${project.id}`,
    lastModified: new Date(project.updated_at),
  }));

  return [...staticEntries, ...projectEntries];
}
