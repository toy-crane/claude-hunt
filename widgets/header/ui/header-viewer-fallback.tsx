import { Skeleton } from "@shared/ui/skeleton";

/**
 * Static placeholder shown while {@link HeaderViewerSlice} streams. Mirrors
 * the slice's two-item layout (submit CTA + avatar) so the header shell does
 * not shift when the viewer cluster resolves.
 */
export function HeaderViewerFallback() {
  return (
    <>
      <Skeleton aria-hidden className="h-8 w-28" />
      <Skeleton aria-hidden className="size-8 rounded-full" />
    </>
  );
}
