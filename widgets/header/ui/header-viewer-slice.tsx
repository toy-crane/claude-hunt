import { SubmitTrigger } from "@features/submit-project";
import { fetchViewer } from "@shared/api/supabase/viewer";
import { Button } from "@shared/ui/button";
import Link from "next/link";

import { HeaderMenu } from "./header-menu";

/**
 * Viewer-dependent right cluster of the header: the submit CTA (which
 * routes anonymous visitors to /login) and either the account menu or a
 * Log in button.
 *
 * This is the ONLY part of the header that reads the auth session
 * (`fetchViewer` → cookies). It is rendered inside a `<Suspense>` boundary
 * in `header.tsx` so the rest of the header — and every page under the
 * (chrome) layout — can prerender as a static shell while this slice
 * streams per request.
 */
export async function HeaderViewerSlice() {
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
