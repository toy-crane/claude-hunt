import type { Cohort } from "@entities/cohort";
import { createAnonServerClient } from "@shared/api/supabase/anon-server";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { cacheLife, cacheTag } from "next/cache";

// TOYCRANE은 운영자(toycrane) 전용 cohort다. 일반 사용자가 온보딩·설정에서
// 선택하거나 보드 필터에서 볼 대상이 아니므로 목록 조회 단계에서 제외한다.
// (DB에는 존재 — 운영자 프로필이 소속)
const HIDDEN_COHORT_NAMES = ["TOYCRANE"];

/**
 * Cohort list shared by the dropdown and the chips. Tagged with `cohorts`
 * so an admin tool could bust it on demand via `updateTag`; today cohorts
 * are managed outside the app (seed / migrations), so the
 * `cacheLife("minutes")` window is what surfaces newly inserted cohorts —
 * e.g. on the onboarding screen — within ~1 minute. Anonymous client →
 * cookie-free and reusable across requests under `use cache`.
 */
export async function fetchCohorts(): Promise<Cohort[]> {
  "use cache";
  cacheTag(CACHE_TAGS.COHORTS);
  cacheLife("minutes");

  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("cohorts")
    .select("*")
    .not("name", "in", `(${HIDDEN_COHORT_NAMES.join(",")})`)
    .order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return data ?? [];
}
