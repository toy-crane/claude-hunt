import type { Cohort } from "./schema";

// TOYCRANE은 운영자(toycrane) 전용 cohort다. 일반 사용자가 온보딩·설정에서
// "새로 선택"할 대상이 아니므로 선택 옵션에서만 제외한다. 프로젝트 보드의
// 필터 칩·라벨·카운트, 설정의 현재 소속 표시처럼 보여주는 용도에서는 그대로
// 노출해야 한다. (DB에는 존재 — 운영자 프로필과 프로젝트가 소속)
const NON_SELECTABLE_COHORT_NAMES: readonly string[] = ["TOYCRANE"];

export function isSelectableCohort(cohort: Pick<Cohort, "name">): boolean {
  return !NON_SELECTABLE_COHORT_NAMES.includes(cohort.name);
}
