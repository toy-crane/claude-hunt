import { fetchCohorts } from "@features/cohort-filter/server";
import { OnboardingForm } from "@features/onboarding";
import { createServerClient } from "@shared/api/supabase/server";
import { getSessionClaims } from "@shared/api/supabase/session";
import { NOINDEX_METADATA } from "@shared/config/site";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = NOINDEX_METADATA;

interface OnboardingPageProps {
  searchParams: Promise<{ next?: string }>;
}

/**
 * Sanitize the `next` query param so it can only redirect to local
 * paths. Mirrors the guard in `app/auth/callback/route.ts`.
 */
function sanitizeNext(next: string | undefined): string {
  if (!next?.startsWith("/")) {
    return "/";
  }
  return next;
}

/**
 * Server component for the onboarding screen. Performs two redirect
 * gates:
 *   - signed-out users -> /login (defensive; middleware should beat us
 *     to it)
 *   - already-onboarded users (profile.cohort_id set) -> `next` (or /)
 * If the user is signed in and has no cohort, renders the form.
 */
export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const { next } = await searchParams;
  const safeNext = sanitizeNext(next);

  const claims = await getSessionClaims();
  if (!claims) {
    redirect("/login");
  }

  // Profile query depends on the viewer id; cohorts fetch is independent —
  // run them in parallel to halve the TTFB of this page.
  const supabase = await createServerClient();
  const [{ data: profile }, cohorts] = await Promise.all([
    supabase.from("profiles").select("cohort_id").eq("id", claims.sub).single(),
    fetchCohorts(),
  ]);

  if (profile?.cohort_id) {
    redirect(safeNext);
  }

  return <OnboardingForm cohorts={cohorts} initialNext={safeNext} />;
}
