import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Test-only endpoint. Enabling Draft Mode makes every `use cache` function
 * re-execute per request and skip the cache, so e2e — which seeds via the
 * admin client (bypassing the `updateTag` invalidation path) — never reads a
 * stale cached row that masks freshly seeded data.
 *
 * Guarded out of production: the bypass must never be reachable on the live
 * site.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not Found", { status: 404 });
  }
  (await draftMode()).enable();
  return NextResponse.json({ draftMode: true });
}
