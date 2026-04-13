import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@shared/api/supabase/types.ts";

export type Profile = Tables<"profiles">;
export type ProfileInsert = TablesInsert<"profiles">;
export type ProfileUpdate = TablesUpdate<"profiles">;
