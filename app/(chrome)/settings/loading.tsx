import { MyProjectsListSkeleton } from "@features/my-projects";
import { SettingsFormSkeleton } from "@features/settings";
import { Card, CardContent } from "@shared/ui/card";
import { Skeleton } from "@shared/ui/skeleton";

// Auth-gated page: it reads the viewer cookie, so the route is dynamic.
// This loading UI is the Suspense boundary that lets the chrome shell
// prerender under Cache Components while the page body streams in. Mirrors
// the real three-section layout (프로필 카드 / 내 프로젝트 / 위험 영역) and
// reuses Card chrome so the cards don't reflow when content arrives.
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-8 p-6">
      <Skeleton className="h-8 w-16" />

      <section className="flex flex-col gap-3">
        <Skeleton className="mx-1 h-3 w-16" />
        <Card>
          <CardContent>
            <SettingsFormSkeleton />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
        <MyProjectsListSkeleton />
      </section>

      <section className="flex flex-col gap-3">
        <Skeleton className="mx-1 h-3 w-16" />
        <Card>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-full max-w-xs" />
              </div>
              <Skeleton className="h-9 w-16 shrink-0" />
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
