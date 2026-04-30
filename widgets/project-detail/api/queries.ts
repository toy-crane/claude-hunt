import type { ProjectImage } from "@entities/project";
import { createClient } from "@shared/api/supabase/server";
import { SCREENSHOT_BUCKET } from "@shared/config/storage";

export interface ProjectDetail {
  author_avatar_url: string | null;
  author_display_name: string | null;
  cohort_id: string | null;
  cohort_name: string | null;
  created_at: string;
  github_url: string | null;
  id: string;
  /** All image paths in display order. images[0] is the primary. */
  images: ProjectImage[];
  /** Resolved public URLs for the images, same order as `images`. */
  imageUrls: string[];
  /** Convenience: equal to `imageUrls[0]` when present. */
  primaryImageUrl: string;
  project_url: string;
  tagline: string;
  title: string;
  updated_at: string;
  user_id: string;
  viewer_has_voted: boolean;
  vote_count: number;
}

/**
 * Reads a single project's full detail row. Joins through
 * `projects_with_vote_count` for cohort label + author display
 * fields (anon-readable). Resolves every entry in `images` to a
 * public storage URL up front so the UI doesn't re-query.
 *
 * Returns `null` when no row matches the id.
 */
export async function fetchProjectDetail(
  id: string,
  viewerUserId: string | null
): Promise<ProjectDetail | null> {
  const supabase = await createClient();
  const projectQuery = supabase
    .from("projects_with_vote_count")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const voteQuery = viewerUserId
    ? supabase
        .from("votes")
        .select("project_id")
        .eq("project_id", id)
        .eq("user_id", viewerUserId)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [projectResult, voteResult] = await Promise.all([
    projectQuery,
    voteQuery,
  ]);

  if (projectResult.error) {
    throw projectResult.error;
  }
  const row = projectResult.data;
  if (!row || row.id == null) {
    return null;
  }

  const screenshots = supabase.storage.from(SCREENSHOT_BUCKET);
  const images = parseImages(row.images);
  const imageUrls = images.map(
    (img) => screenshots.getPublicUrl(img.path).data.publicUrl
  );
  // Fallback for legacy rows that might still rely on screenshot_path
  // before the backfill completes.
  if (imageUrls.length === 0 && row.primary_image_path) {
    imageUrls.push(
      screenshots.getPublicUrl(row.primary_image_path).data.publicUrl
    );
  }

  return {
    id: row.id,
    user_id: row.user_id ?? "",
    cohort_id: row.cohort_id ?? null,
    cohort_name: row.cohort_name ?? null,
    title: row.title ?? "",
    tagline: row.tagline ?? "",
    project_url: row.project_url ?? "",
    github_url: row.github_url ?? null,
    images,
    imageUrls,
    primaryImageUrl: imageUrls[0] ?? "",
    vote_count: Number(row.vote_count ?? 0),
    viewer_has_voted: voteResult.data != null,
    author_display_name: row.author_display_name ?? null,
    author_avatar_url: row.author_avatar_url ?? null,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

function parseImages(value: unknown): ProjectImage[] {
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
    .filter((v): v is ProjectImage => v != null);
}
