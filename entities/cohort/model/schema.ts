import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@shared/api/supabase/types.ts";

export type Cohort = Tables<"cohorts">;
export type CohortInsert = TablesInsert<"cohorts">;
export type CohortUpdate = TablesUpdate<"cohorts">;
