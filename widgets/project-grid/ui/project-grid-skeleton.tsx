import { Skeleton } from "@shared/ui/skeleton";

interface ProjectGridSkeletonProps {
  /** Number of placeholder cards to render. Defaults to 6 (fills a 3-col grid). */
  count?: number;
}

function ProjectCardSkeleton() {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-md bg-card ring-1 ring-foreground/10"
      data-testid="project-card-skeleton"
    >
      {/* Thumbnail */}
      <Skeleton className="aspect-video w-full" />

      {/* Body */}
      <div className="flex flex-col gap-1.5 p-4">
        {/* Title + vote count row */}
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-10 shrink-0" />
        </div>
        {/* Tagline */}
        <Skeleton className="mt-0.5 h-3 w-full" />
        <Skeleton className="h-3 w-3/5" />
        {/* Author */}
        <Skeleton className="mt-1 h-3 w-1/3" />
        {/* Vote button action strip */}
        <Skeleton className="mt-2 h-8 w-full" />
      </div>
    </div>
  );
}

export function ProjectGridSkeleton({ count = 6 }: ProjectGridSkeletonProps) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="project-grid-skeleton"
    >
      {Array.from({ length: count }, (_, i) => {
        const key = `skeleton-${i}`;
        return <ProjectCardSkeleton key={key} />;
      })}
    </div>
  );
}
