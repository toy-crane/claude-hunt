import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@shared/api/supabase/types";

/**
 * Shape of a single image entry inside `projects.images` (jsonb array).
 * The first entry is the primary image used for the board thumbnail and
 * the social preview. Additional fields can be added later (alt text,
 * captions) without a schema migration.
 */
export interface ProjectImage {
  path: string;
}

export type Project = Tables<"projects">;
export type ProjectInsert = TablesInsert<"projects">;
export type ProjectUpdate = TablesUpdate<"projects">;
