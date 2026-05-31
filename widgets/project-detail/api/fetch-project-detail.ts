import type { ProjectScreenshot } from "@entities/project";
import { createClient } from "@shared/api/supabase/server";
import { SCREENSHOT_BUCKET } from "@shared/config/storage";
import { cache } from "react";

/**
 * Viewer-agnostic project detail row. Shared across every caller of the
 * detail route (metadata + page + OG) regardless of whether a viewer is
 * signed in, so the underlying `projects_with_vote_count` query can hit
 * the React.cache dedup with identical `(id)` arguments.
 */
export interface ProjectCore {
  author_avatar_url: string | null;
  author_display_name: string | null;
  cohort_id: string | null;
  cohort_label: string | null;
  cohort_name: string | null;
  created_at: string;
  github_url: string | null;
  id: string;
  /** All image paths in display order. images[0] is the primary. */
  images: ProjectScreenshot[];
  /** Convenience: equal to `screenshotUrls[0]` when present. */
  primaryScreenshotUrl: string;
  project_url: string;
  /** Resolved public URLs for the images, same order as `images`. */
  screenshotUrls: string[];
  tagline: string;
  title: string;
  updated_at: string;
  user_id: string;
  vote_count: number;
}

export interface ProjectDetail extends ProjectCore {
  viewer_has_voted: boolean;
}

/**
 * Reads a single project's viewer-agnostic row. Joins through
 * `projects_with_vote_count` for cohort label + author display fields
 * (anon-readable) and resolves every image path to a public storage
 * URL up front. Wrapped in `cache()` so `generateMetadata(id)` and
 * `Page(id, …)` share one Supabase query in the same render tree.
 *
 * Returns `null` when no row matches the id.
 */
export const fetchProjectCore = cache(
  async (id: string): Promise<ProjectCore | null> => {
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("projects_with_vote_count")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!row || row.id == null) {
      return null;
    }

    const screenshots = supabase.storage.from(SCREENSHOT_BUCKET);
    const images = parseScreenshots(row.images);
    const screenshotUrls = images.map(
      (img) => screenshots.getPublicUrl(img.path).data.publicUrl
    );

    return {
      id: row.id,
      user_id: row.user_id ?? "",
      cohort_id: row.cohort_id ?? null,
      cohort_label: row.cohort_label ?? null,
      cohort_name: row.cohort_name ?? null,
      title: row.title ?? "",
      tagline: row.tagline ?? "",
      project_url: row.project_url ?? "",
      github_url: row.github_url ?? null,
      images,
      screenshotUrls,
      primaryScreenshotUrl: screenshotUrls[0] ?? "",
      vote_count: Number(row.vote_count ?? 0),
      author_display_name: row.author_display_name ?? null,
      author_avatar_url: row.author_avatar_url ?? null,
      created_at: row.created_at ?? "",
      updated_at: row.updated_at ?? "",
    };
  }
);

/**
 * Checks whether the signed-in viewer has voted on a specific project.
 * Cached so multiple callers in one render share a single `votes` lookup.
 */
export const fetchViewerVote = cache(
  async (projectId: string, viewerUserId: string): Promise<boolean> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("votes")
      .select("project_id")
      .eq("project_id", projectId)
      .eq("user_id", viewerUserId)
      .maybeSingle();
    return data != null;
  }
);

/**
 * Composes the viewer-agnostic core with the viewer-specific vote flag.
 * Keeps the existing `(id, viewerUserId)` signature so callers don't
 * need to coordinate two fetches themselves.
 */
export async function fetchProjectDetail(
  id: string,
  viewerUserId: string | null
): Promise<ProjectDetail | null> {
  const [core, viewerHasVoted] = await Promise.all([
    fetchProjectCore(id),
    viewerUserId ? fetchViewerVote(id, viewerUserId) : Promise.resolve(false),
  ]);
  if (!core) {
    return null;
  }
  return { ...core, viewer_has_voted: viewerHasVoted };
}

function parseScreenshots(value: unknown): ProjectScreenshot[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (item && typeof item === "object" && "path" in item) {
        const path = (item as { path: unknown }).path;
        if (typeof path === "string" && path.length > 0) {
          return { path };
        }
      }
      return null;
    })
    .filter((v): v is ProjectScreenshot => v != null);
}
