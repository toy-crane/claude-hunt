"use client";

import { useEffect } from "react";

// iOS Safari 뒤로가기 시 sticky 헤더가 한순간 사라지는 문제의 가드.
//
// cacheComponents의 bfcache는 비활성 페이지를 <Activity hidden>(display:none)으로
// 유지하므로, 짧은 페이지에 머무는 동안 떠나온 긴 페이지는 문서 높이에 기여하지
// 않는다. 뒤로가기 순간 Safari가 복원하려는 scrollY가 현재 문서의 최대 스크롤을
// 넘으면 복원이 클램프·보류됐다가 React 커밋으로 높이가 복구된 뒤 컴포지터에서
// 비동기로 재적용되는데, 그 프레임 사이에 sticky 요소가 문서 정적 위치(화면 밖)에
// 페인트된다. popstate 시점에 도착 항목의 기록된 높이만큼 body를 미리 늘려 두면
// Safari가 클램프 없이 즉시 복원할 수 있다.
//
// 해제는 타임아웃 단일 경로다. scroll 이벤트 기반 해제는 popstate 직후 주소창
// 이동·클램프 스크롤이 진짜 복원보다 먼저 이벤트를 쏘아 연장을 조기에 풀 수
// 있어 쓰지 않는다. 해제 시점에는 도착 페이지가 이미 커밋되어 실제 문서 높이가
// 기록값과 같으므로 연장이 길게 남아도 화면 변화는 없다.
export function ScrollClampGuard() {
  useEffect(() => {
    const heights = new Map<string, number>();
    const keyOf = () => location.pathname + location.search;

    let pending: ReturnType<typeof setTimeout> | null = null;

    const record = () => {
      // 연장 중의 문서 높이는 min-height로 부풀려져 있으므로 기록하지 않는다.
      if (pending) {
        return;
      }
      heights.set(keyOf(), document.documentElement.scrollHeight);
    };

    const clear = () => {
      if (pending) {
        clearTimeout(pending);
        pending = null;
      }
      document.body.style.minHeight = "";
    };

    const extend = () => {
      clear();
      const recorded = heights.get(keyOf());
      if (!recorded || recorded <= document.documentElement.scrollHeight) {
        return;
      }
      document.body.style.minHeight = `${recorded}px`;
      pending = setTimeout(clear, 3000);
    };

    window.addEventListener("scroll", record, { passive: true });
    window.addEventListener("popstate", extend);
    return () => {
      window.removeEventListener("scroll", record);
      window.removeEventListener("popstate", extend);
      clear();
    };
  }, []);

  return null;
}
