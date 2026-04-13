import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@shared/api/supabase/types.ts";

export type Project = Tables<"projects">;
export type ProjectInsert = TablesInsert<"projects">;
export type ProjectUpdate = TablesUpdate<"projects">;
