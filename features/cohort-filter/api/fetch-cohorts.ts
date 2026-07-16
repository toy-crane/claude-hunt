import type { Cohort } from "@entities/cohort";
import { createAnonServerClient } from "@shared/api/supabase/anon-server";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Cohort list shared by the board filter, onboarding, and settings. Tagged
 * with `cohorts`
 * so an admin tool could bust it on demand via `updateTag`; today cohorts
 * are managed outside the app (seed / migrations), so the
 * `cacheLife("minutes")` window is what surfaces newly inserted cohorts —
 * e.g. on the onboarding screen — within ~1 minute. Anonymous client →
 * cookie-free and reusable across requests under `use cache`.
 *
 * 의도적으로 전체 cohort를 반환한다 — 운영자 전용 TOYCRANE도 포함. 보드
 * 필터의 옵션·라벨·카운트와 설정의 현재 소속 표시는 전체 목록이 필요하다.
 * 사용자가 "새로 선택"하는 UI(온보딩·설정 드롭다운 옵션)만
 * `isSelectableCohort`(@entities/cohort)로 걸러서 렌더링한다.
 */
export async function fetchCohorts(): Promise<Cohort[]> {
  "use cache";
  cacheTag(CACHE_TAGS.COHORTS);
  cacheLife("minutes");

  const supabase = createAnonServerClient();
  // Newest class first — that's where every submission and vote lands, so it
  // leads the filter. `display_order` exists precisely because the columns
  // we'd otherwise sort on don't work: `name` is lexicographic ("LGE-10"
  // between "LGE-1" and "LGE-2") and `created_at` reflects batched inserts,
  // not class order. `name` breaks ties so the order is deterministic.
  const { data, error } = await supabase
    .from("cohorts")
    .select("*")
    .order("display_order", { ascending: false })
    .order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return data ?? [];
}
