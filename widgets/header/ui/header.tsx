import { Logo } from "@shared/ui/logo";
import { Suspense } from "react";

import { fetchProjectCount } from "../api/fetch-project-count";
import { HeaderNav } from "./header-nav";
import { HeaderScrollEffect } from "./header-scroll-effect";
import { HeaderAuthFallback, HeaderViewerSlot } from "./header-viewer-slot";

export async function Header() {
  // `fetchProjectCount` is viewer-agnostic (cached); it renders into the
  // static shell. Only the viewer-specific corner reads the auth cookie, so
  // it lives behind a Suspense boundary and streams in per request.
  const projectCount = await fetchProjectCount();

  return (
    <header className="site-header sticky top-0 z-50 border-b bg-background">
      <HeaderScrollEffect />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Logo />
          <HeaderNav className="hidden md:flex" projectCount={projectCount} />
        </div>
        <div className="flex items-center gap-2">
          <Suspense fallback={<HeaderAuthFallback />}>
            <HeaderViewerSlot />
          </Suspense>
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl border-t px-6 md:hidden">
        <HeaderNav projectCount={projectCount} />
      </div>
    </header>
  );
}
