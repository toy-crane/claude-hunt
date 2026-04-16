import type { Database } from "@shared/api/supabase/types";
import { env } from "@shared/config/env";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Paths where the onboarding gate does NOT fire even if the user is
 * signed in without a cohort. These are paths the user must be able
 * to reach in order to finish onboarding or escape the gate.
 */
const ONBOARDING_BYPASS_PATHS = [
  "/onboarding",
  "/login",
  "/auth", // /auth/callback, /auth/auth-code-error, ...
  "/terms",
  "/privacy",
];

export function isOnboardingBypassPath(pathname: string): boolean {
  return ONBOARDING_BYPASS_PATHS.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Root proxy (Next.js 16 replacement for middleware.ts). Refreshes the
 * Supabase session and gates signed-in users without a cohort to
 * /onboarding. Static assets, Next.js internals, and image files are
 * excluded at the matcher level so this function body never runs for
 * them — no DB round-trip cost.
 */
export async function proxy(request: NextRequest) {
  let proxyResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          proxyResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            proxyResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated visitors: the public landing page + login flow
  // must remain reachable.
  if (!user) {
    return proxyResponse;
  }

  const pathname = request.nextUrl.pathname;
  if (isOnboardingBypassPath(pathname)) {
    return proxyResponse;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("cohort_id")
    .eq("id", user.id)
    .single();

  if (profile?.cohort_id) {
    return proxyResponse;
  }

  // Signed in, no cohort, not on a bypass path -> bounce to onboarding
  // with the original path+search preserved so we can return to it.
  const next = `${pathname}${request.nextUrl.search}`;
  const url = request.nextUrl.clone();
  url.pathname = "/onboarding";
  url.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

/**
 * Matcher excludes Next.js internals, common image extensions, and
 * favicon so the proxy body never runs for them — preventing
 * unnecessary Supabase round-trips on asset requests.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
