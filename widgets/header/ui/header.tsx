import { Logo } from "@shared/ui/logo";
import { Suspense } from "react";

import { fetchProjectCount } from "../api/fetch-project-count";
import { HeaderNav, HeaderNavFallback } from "./header-nav";
import { HeaderAuthFallback, HeaderViewerSlot } from "./header-viewer-slot";

export async function Header() {
  // `fetchProjectCount` is viewer-agnostic (cached); it renders into the
  // static shell. The nav's active-link highlight (usePathname) and the
  // viewer-specific corner (auth cookie) are request-dynamic, so each sits
  // behind its own Suspense boundary and streams in per request.
  const projectCount = await fetchProjectCount();

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Logo />
          <Suspense
            fallback={
              <HeaderNavFallback
                className="hidden md:flex"
                projectCount={projectCount}
              />
            }
          >
            <HeaderNav className="hidden md:flex" projectCount={projectCount} />
          </Suspense>
        </div>
        <div className="flex items-center gap-2">
          <Suspense fallback={<HeaderAuthFallback />}>
            <HeaderViewerSlot />
          </Suspense>
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl border-t px-6 md:hidden">
        <Suspense fallback={<HeaderNavFallback projectCount={projectCount} />}>
          <HeaderNav projectCount={projectCount} />
        </Suspense>
      </div>
    </header>
  );
}
