import { type Cohort, sortCohortsForDisplay } from "@entities/cohort";
import { createAnonServerClient } from "@shared/api/supabase/anon-server";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Cohort list shared by the dropdown and the chips. Tagged with `cohorts`
 * so an admin tool could bust it on demand via `updateTag`; today cohorts
 * are managed outside the app (seed / migrations), so the
 * `cacheLife("minutes")` window is what surfaces newly inserted cohorts —
 * e.g. on the onboarding screen — within ~1 minute. Anonymous client →
 * cookie-free and reusable across requests under `use cache`.
 *
 * 의도적으로 전체 cohort를 반환한다 — 운영자 전용 TOYCRANE도 포함. 보드
 * 필터 칩·라벨·카운트와 설정의 현재 소속 표시는 전체 목록이 필요하다.
 * 사용자가 "새로 선택"하는 UI(온보딩·설정 드롭다운 옵션)만
 * `isSelectableCohort`(@entities/cohort)로 걸러서 렌더링한다.
 *
 * 정렬은 `sortCohortsForDisplay`가 전부 맡는다 — 최신 클래스가 먼저, 인프런과
 * toycrane은 양 끝 고정. 쿼리에 `order by`를 두지 않는 건 그게 같은 규칙의
 * 두 번째 사본이 되기 때문이다. `name`이 unique라 정렬 결과는 입력 순서와
 * 무관하게 확정되므로 SQL 정렬은 결정성에 아무것도 보태지 못하고, 콜레이션
 * 차이로 오히려 어긋날 수 있다.
 */
export async function fetchCohorts(): Promise<Cohort[]> {
  "use cache";
  cacheTag(CACHE_TAGS.COHORTS);
  cacheLife("minutes");

  const supabase = createAnonServerClient();
  const { data, error } = await supabase.from("cohorts").select("*");
  if (error) {
    throw error;
  }
  return sortCohortsForDisplay(data ?? []);
}
