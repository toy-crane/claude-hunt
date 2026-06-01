import { Skeleton } from "@shared/ui/skeleton";

const ROW_KEYS = ["row-1", "row-2", "row-3", "row-4", "row-5", "row-6"];

/**
 * Loading placeholder for {@link ProjectGrid}. Reuses the bordered
 * section grid and the desktop header, then renders a handful of rows
 * that mirror {@link ProjectCard}'s two layouts (desktop subgrid row /
 * mobile stacked card with a 16:10 thumbnail), so the board doesn't
 * reflow on either breakpoint when projects stream in.
 */
export function ProjectGridSkeleton() {
  return (
    <section
      aria-hidden="true"
      className="border border-border min-[720px]:grid min-[720px]:grid-cols-[52px_72px_minmax(0,1fr)_130px_auto] min-[720px]:gap-x-4 min-[720px]:px-5"
      data-testid="project-grid-skeleton"
    >
      {/* Desktop header — static labels (no data) */}
      <div className="col-span-full hidden grid-cols-subgrid bg-muted py-2 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em] min-[720px]:-mx-5 min-[720px]:grid min-[720px]:px-5">
        <div>RANK</div>
        <div>PREVIEW</div>
        <div>NAME</div>
        <div>AUTHOR</div>
        <div>VOTES</div>
      </div>

      <ul className="flex flex-col divide-y divide-border min-[720px]:col-span-full min-[720px]:grid min-[720px]:grid-cols-subgrid">
        {ROW_KEYS.map((key) => (
          <li
            className="min-[720px]:col-span-full min-[720px]:grid min-[720px]:grid-cols-subgrid"
            key={key}
          >
            {/* Desktop row */}
            <div className="col-span-full hidden grid-cols-subgrid items-center py-3.5 min-[720px]:grid">
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-10 w-16" />
              <div className="flex min-w-0 flex-col gap-1">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-8 w-12" />
            </div>

            {/* Mobile stacked card */}
            <div className="flex flex-col gap-3 px-3.5 py-4 min-[720px]:hidden">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="aspect-[16/10] w-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3.5 w-full" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-8 w-12" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
