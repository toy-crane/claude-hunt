"use client";

import { useEffect, useState } from "react";

// ⚠️ 진단 전용 — 머지 전에 반드시 제거한다.
//
// URL에 ?sdbg=1 을 한 번 붙이면 세션 동안 활성화된다. ?sdbg=fixed 는 헤더를
// fixed로 바꾸는 실험(globals.css의 html.sdbg-fixed-hdr)을 함께 켠다.
// popstate 이후 2.5초간 매 프레임 scrollY / 문서높이 / body min-height /
// 헤더 rect.top 을 기록해 화면 하단 오버레이(최신 행이 위)로 보여 준다.
// 깜빡임 순간 ht=0인데 헤더가 안 보이면 레이아웃은 정상인 컴포지터
// 미스페인트, ht가 큰 음수면 레이아웃 단계의 sticky 지연이다. mh 열로
// ScrollClampGuard 연장이 그 순간 살아있었는지 함께 판별한다.
export function ScrollDebugProbe() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const param = new URLSearchParams(location.search).get("sdbg");
    if (param) {
      sessionStorage.setItem("sdbg", param);
    }
    const mode = sessionStorage.getItem("sdbg");
    if (!mode) {
      return;
    }
    if (mode === "fixed") {
      document.documentElement.classList.add("sdbg-fixed-hdr");
    }

    let buf: string[] = [];
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
    };

    const onPop = () => {
      snap("◀POP");
      if (sampling) {
        return;
      }
      sampling = true;
      const t0 = performance.now();
      const loop = () => {
        snap("");
        setLines([...buf].reverse());
        if (performance.now() - t0 < 2500) {
          requestAnimationFrame(loop);
        } else {
          sampling = false;
        }
      };
      requestAnimationFrame(loop);
    };

    const onScroll = () => {
      if (sampling) {
        snap("SCR");
      }
    };

    window.addEventListener("popstate", onPop);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.classList.remove("sdbg-fixed-hdr");
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
