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

  // 헤더는 position: fixed (sticky 아님). iOS 26 Safari는 뒤로가기 시 네이티브
  // 스크롤 복원을 컴포지터에서 비동기로 재적용하는데, sticky 헤더는 그 프레임에
  // 위치가 한 박자 늦게 재계산돼 화면 밖으로 사라졌다 돌아오는 깜빡임이 생긴다
  // (스크롤된 리스트→상세→뒤로가기에서 항상 재현). fixed는 뷰포트에 고정돼 스크롤
  // 오프셋과 무관하므로 재계산 창이 없어 깜빡이지 않는다. sticky로 되돌리지 말 것
  // — 흐름에서 빠지는 만큼의 본문 오프셋은 app/(chrome)/layout.tsx 가 책임진다.
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b bg-background">
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
