"use client";

import { useEffect, useState } from "react";

// ⚠️ 진단 전용 — 머지 전에 반드시 제거한다.
//
// URL에 ?sdbg=<runid> 를 붙이면 세션 동안 활성화된다(런 ID가 바뀌면 상태
// 리셋). 모드 문자열에 "fixed"가 들어가면 헤더 fixed 실험(globals.css의
// html.sdbg-fixed-hdr)을 켜고, "auto"가 들어가면 자동 재현 드라이버
// (/projects 깊은 스크롤 → 첫 카드 클릭 → 2.5초 후 history.back())를 돌린다.
// BOOT(문서 시작)/PAGESHOW/CLICK/BACK/◀POP/SCR 이벤트와 함께 scrollY /
// 문서높이 / body min-height / 헤더 rect.top 을 기록하고 sessionStorage에
// 보존해 MPA 리로드에도 로그가 살아남는다. 화면 하단 오버레이(최신 행이
// 위)로 표시한다. 깜빡임 순간 ht=0인데 헤더가 안 보이면 컴포지터
// 미스페인트, ht가 큰 음수면 레이아웃 단계의 sticky 지연이다.
const DETAIL_PATH = /^\/projects\/[^/]+$/;

const readMode = () => {
  const param = new URLSearchParams(location.search).get("sdbg");
  if (param && sessionStorage.getItem("sdbg") !== param) {
    sessionStorage.setItem("sdbg", param);
    sessionStorage.removeItem("sdbg-step");
    sessionStorage.removeItem("sdbg-log");
  }
  return sessionStorage.getItem("sdbg");
};

// 처방 후보 토글: ?fix=layer|fixed|manual|none 을 한 번 붙이면 세션 동안 유지.
// layer/fixed 는 globals.css 클래스로, manual 은 아래 스크롤 복원 로직으로 적용.
const readFix = () => {
  const param = new URLSearchParams(location.search).get("fix");
  if (param) {
    sessionStorage.setItem("sdbg-fix", param);
  }
  return sessionStorage.getItem("sdbg-fix") ?? "none";
};

export function ScrollDebugProbe() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const mode = readMode();
    const fix = readFix();
    if (!mode) {
      return;
    }
    if (fix === "layer" || fix === "fixed") {
      document.documentElement.classList.add(`sdbg-fix-${fix}`);
    }
    // manual: 라우터의 네이티브 스크롤 복원('auto')을 끄고, popstate 이후
    // 도착 페이지가 커밋된 뒤(rAF 2회) 기록한 scrollY를 직접 적용한다.
    // 클램프 없이 한 번에 복원되므로 늦은 비동기 재적용 창이 사라진다.
    if (fix === "manual") {
      history.scrollRestoration = "manual";
    }

    let buf: string[] = JSON.parse(sessionStorage.getItem("sdbg-log") ?? "[]");
    let last = "";
    let sampling = false;

    const snap = (tag: string) => {
      const rect = document.querySelector("header")?.getBoundingClientRect();
      const row = `y=${Math.round(scrollY)} dh=${document.documentElement.scrollHeight} mh=${document.body.style.minHeight || "-"} ht=${rect ? Math.round(rect.top) : "?"}`;
      if (row === last && tag === "") {
        return;
      }
      last = row;
      buf.push(
        `${Math.round(performance.now() % 100_000)} ${row}${tag ? ` ${tag}` : ""}`
      );
      if (buf.length > 120) {
        buf = buf.slice(-120);
      }
      sessionStorage.setItem("sdbg-log", JSON.stringify(buf));
      setLines([...buf].reverse());
    };

    snap("BOOT");

    const onPageShow = (e: PageTransitionEvent) => {
      snap(e.persisted ? "PAGESHOW(bfcache)" : "PAGESHOW(load)");
    };

    const scrolls = new Map<string, number>();
    const keyOf = () => location.pathname + location.search;

    const onPop = () => {
      snap("◀POP");
      if (fix === "manual") {
        const target = scrolls.get(keyOf()) ?? 0;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            window.scrollTo(0, target);
            snap("MANUAL");
          })
        );
      }
      if (sampling) {
        return;
      }
      sampling = true;
      const t0 = performance.now();
      const loop = () => {
        snap("");
        if (performance.now() - t0 < 2500) {
          requestAnimationFrame(loop);
        } else {
          sampling = false;
        }
      };
      requestAnimationFrame(loop);
    };

    const onScroll = () => {
      scrolls.set(keyOf(), Math.round(scrollY));
      if (sampling) {
        snap("SCR");
      }
    };

    // 자동 재현 드라이버 — 라우터 훅 없이 폴링으로 현재 경로를 보고 단계 수행.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = setInterval(() => {
      if (!mode.includes("auto")) {
        return;
      }
      const step = sessionStorage.getItem("sdbg-step") ?? "0";
      const path = location.pathname;
      if (path === "/projects" && step === "0" && performance.now() > 4500) {
        sessionStorage.setItem("sdbg-step", "0.5");
        window.scrollTo(0, 2500);
        timer = setTimeout(() => {
          sessionStorage.setItem("sdbg-step", "1");
          snap("CLICK");
          document
            .querySelector<HTMLAnchorElement>(
              'main a[href^="/projects/"]:not([href$="/new"])'
            )
            ?.click();
        }, 1500);
      } else if (DETAIL_PATH.test(path) && step === "1") {
        sessionStorage.setItem("sdbg-step", "1.5");
        timer = setTimeout(() => {
          sessionStorage.setItem("sdbg-step", "2");
          snap("BACK");
          history.back();
        }, 2500);
      }
    }, 500);

    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", onPop);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearInterval(tick);
      if (timer) {
        clearTimeout(timer);
      }
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.classList.remove("sdbg-fix-layer");
      document.documentElement.classList.remove("sdbg-fix-fixed");
    };
  }, []);

  if (lines.length === 0) {
    return null;
  }
  return (
    <div
      style={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        zIndex: 99_999,
        maxHeight: "45vh",
        overflowY: "auto",
        background: "rgba(0,0,0,0.85)",
        color: "#4ade80",
        fontFamily: "monospace",
        fontSize: 9,
        lineHeight: 1.25,
        padding: 4,
        whiteSpace: "pre",
      }}
    >
      {lines.join("\n")}
    </div>
  );
}
