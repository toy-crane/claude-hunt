import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@shared/api/supabase/types";

export type Cohort = Tables<"cohorts">;
export type CohortInsert = TablesInsert<"cohorts">;
export type CohortUpdate = TablesUpdate<"cohorts">;
