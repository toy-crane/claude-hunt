import { Skeleton } from "@shared/ui/skeleton";

const CARD_KEYS = ["card-1", "card-2", "card-3"];

/**
 * Loading placeholder for {@link RunnersUpSection}. Reuses the real
 * section header and the mobile-snap / desktop-grid container with three
 * cards mirroring {@link RunnerUpCard} (16:9 image + title + tagline +
 * footer), so the runners-up row doesn't reflow on load.
 */
export function RunnersUpSkeleton() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-x-visible md:px-0 md:pb-0">
        {CARD_KEYS.map((key) => (
          <div className="w-60 flex-shrink-0 snap-start md:w-auto" key={key}>
            <div className="flex h-full flex-col overflow-hidden rounded-md bg-card shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)]">
              <Skeleton className="aspect-[16/9] w-full rounded-none" />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="mt-auto flex items-center justify-between pt-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-8" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
