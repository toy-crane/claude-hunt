import { Skeleton } from "@shared/ui/skeleton";

const ROW_KEYS = ["row-1", "row-2", "row-3"];

/**
 * Loading placeholder for {@link MyProjectsList}. Mirrors the table
 * chrome — the desktop-only header row, a few project rows on the same
 * `[1fr_56px_72px_72px]` grid, and the trailing count line — so the
 * settings projects section keeps its height while data streams in.
 */
export function MyProjectsListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden bg-card ring-1 ring-foreground/10">
        {/* Header — desktop only, static labels (no data) */}
        <div className="hidden grid-cols-[1fr_56px_72px_72px] items-center gap-2.5 border-border border-b bg-muted px-3 py-2 font-mono text-[11px] text-muted-foreground min-[720px]:grid">
          <span>제목</span>
          <span className="text-right">추천</span>
          <span>제출일</span>
          <span className="text-right">작업</span>
        </div>

        {ROW_KEYS.map((key) => (
          <div
            className="grid grid-cols-[1fr_auto] items-center gap-2.5 border-border border-b px-3 py-2.5 last:border-b-0 min-[720px]:grid-cols-[1fr_56px_72px_72px] min-[720px]:py-2"
            key={key}
          >
            <div className="flex min-w-0 flex-col gap-1">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="hidden h-4 w-8 justify-self-end min-[720px]:block" />
            <Skeleton className="hidden h-3 w-12 min-[720px]:block" />
            <div className="flex shrink-0 justify-end gap-1">
              <Skeleton className="size-7" />
              <Skeleton className="size-7" />
            </div>
          </div>
        ))}
      </div>

      <Skeleton className="h-3 w-32" />
    </div>
  );
}
