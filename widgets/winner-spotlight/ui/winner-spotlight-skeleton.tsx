import { Skeleton } from "@shared/ui/skeleton";

/**
 * Loading placeholder for {@link WinnerSpotlight}. Reuses the real card
 * grid (`md:grid-cols-[1.55fr_1fr]`) with a 16:10 image on the left and
 * the text/vote panel on the right, so the home hero keeps its height
 * while the monthly winner streams in.
 */
export function WinnerSpotlightSkeleton() {
  return (
    <article className="grid grid-cols-1 overflow-hidden rounded-lg bg-card shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] md:grid-cols-[1.55fr_1fr]">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />

      <div className="flex flex-col justify-between gap-5 p-5 md:p-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-7 w-3/4" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-4 w-28" />
        </div>

        <div className="flex items-center gap-3 border-t border-dashed pt-5">
          <Skeleton className="h-12 w-16" />
          <Skeleton className="h-11 flex-1" />
        </div>
      </div>
    </article>
  );
}
