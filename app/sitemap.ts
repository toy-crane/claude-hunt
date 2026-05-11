import { createAnonServerClient } from "@shared/api/supabase/anon-server";
import type { MetadataRoute } from "next";

export const revalidate = 3600;

const SITE_URL = "https://www.claude-hunt.com";

const STATIC_PATHS = ["/", "/projects", "/privacy", "/terms"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
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
