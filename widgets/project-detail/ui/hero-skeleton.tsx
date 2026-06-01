import { Skeleton } from "@shared/ui/skeleton";

/**
 * Loading placeholder for {@link Hero}. Mirrors the real render order —
 * title + tagline with the vote button pinned top-right, the meta line,
 * the 16:10 image, then the visit CTA — so the detail page doesn't jump
 * when the content streams in.
 *
 * Sized for the common case (project has at least one image). The
 * optional GitHub link and owner controls are omitted on purpose.
 */
export function HeroSkeleton() {
  return (
    <article className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <Skeleton className="h-12 w-11 shrink-0" />
      </header>

      <Skeleton className="h-4 w-40" />

      <Skeleton className="aspect-[16/10] w-full" />

      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-10 w-36" />
      </div>
    </article>
  );
}
