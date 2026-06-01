import { SubmitTrigger } from "@features/submit-project";
import { fetchViewer } from "@shared/api/supabase/viewer";
import { Button } from "@shared/ui/button";
import { Skeleton } from "@shared/ui/skeleton";
import Link from "next/link";

import { HeaderMenu } from "./header-menu";

/**
 * Viewer-specific corner of the header (submit CTA + account menu / login).
 * Split out of the static header shell so it can sit behind a `<Suspense>`
 * boundary: the shell prerenders and this slot — the only part that reads
 * the auth cookie via `fetchViewer()` — streams in per request once
 * Cache Components is enabled.
 */
export async function HeaderViewerSlot() {
  const viewer = await fetchViewer();

  return (
    <>
      <SubmitTrigger isAuthenticated={Boolean(viewer)} />
      {viewer ? (
        <HeaderMenu
          avatarUrl={viewer.avatarUrl}
          displayName={viewer.displayName}
        />
      ) : (
        <Button asChild size="sm" variant="outline">
          <Link href="/login">로그인</Link>
        </Button>
      )}
    </>
  );
}

/**
 * Placeholder shown while {@link HeaderViewerSlot} resolves. Mirrors the slot's
 * footprint (submit button + avatar) to avoid layout shift, and stays
 * auth-neutral so neither the signed-in nor signed-out UI flashes first.
 */
export function HeaderAuthFallback() {
  return (
    <>
      <Skeleton className="h-8 w-28" />
      <Skeleton className="size-8 rounded-full" />
    </>
  );
}
