"use client";

import { consumeJustSubmitted } from "@shared/lib/just-submitted";
import { type ReactNode, useLayoutEffect, useRef } from "react";

const BLOCK_DURATION_MS = 350;
const BLOCK_STAGGER_MS = 60;

export interface HeroEntranceProps {
  children: ReactNode;
  className?: string;
  projectId: string;
}

/**
 * Plays a one-shot staggered entrance over the hero's top-level blocks
 * when the viewer arrives right after submitting this project — the
 * just-submitted flag is consumed in the effect, so refreshes and every
 * later visit render statically. WAAPI (not CSS classes) so the server
 * markup stays animation-free and there is nothing to hydrate;
 * useLayoutEffect starts it before paint, so no flash of settled
 * content. StrictMode's double effect is self-healing: the first run
 * consumes the flag, the second finds none.
 */
export function HeroEntrance({
  children,
  className,
  projectId,
}: HeroEntranceProps) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!(root && consumeJustSubmitted(projectId))) {
      return;
    }
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    Array.from(root.children).forEach((el, index) => {
      if (typeof el.animate !== "function") {
        // jsdom has no Web Animations API.
        return;
      }
      el.animate(
        reduceMotion
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: "translateY(8px)" },
              { opacity: 1, transform: "none" },
            ],
        {
          delay: reduceMotion ? 0 : index * BLOCK_STAGGER_MS,
          duration: BLOCK_DURATION_MS,
          easing: "ease-out",
          fill: "backwards",
        }
      );
    });
  }, [projectId]);

  return (
    <article className={className} ref={ref}>
      {children}
    </article>
  );
}
