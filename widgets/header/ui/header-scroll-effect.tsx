"use client";

import { useEffect } from "react";

export function HeaderScrollEffect() {
  useEffect(() => {
    const root = document.documentElement;
    let ticking = false;

    const update = () => {
      root.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      root.classList.remove("is-scrolled");
    };
  }, []);

  return null;
}
