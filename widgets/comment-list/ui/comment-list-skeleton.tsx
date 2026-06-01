import { Skeleton } from "@shared/ui/skeleton";

/**
 * Loading placeholder for {@link CommentList}. Mirrors only the parts
 * that always render — the section header and the composer (textarea +
 * submit). The comment rows are intentionally omitted: their count is
 * unknown until threads resolve, so drawing a fixed number of phantom
 * rows would over-promise and collapse jarringly when a project has no
 * comments. Real rows stream in below the composer once loaded.
 */
export function CommentListSkeleton() {
  return (
    <section className="flex flex-col gap-4">
      <Skeleton className="h-5 w-16" />

      <div className="flex flex-col gap-2">
        <Skeleton className="h-20 w-full" />
        <div className="flex justify-end">
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </section>
  );
}
