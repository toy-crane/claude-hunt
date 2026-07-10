import { createAdminClient } from "@shared/api/supabase/admin";
import { createServerClient } from "@shared/api/supabase/server";
import { env } from "@shared/config/env";
import { getRequestOrigin } from "@shared/lib/request-origin";
import { NextResponse } from "next/server";

const ALLOWED_EMAIL_DOMAINS = ["example.com", "test.local"];
const LOCAL_SUPABASE_HOSTNAMES = ["127.0.0.1", "localhost"];

function notFound() {
  return new NextResponse("Not Found", { status: 404 });
}

/**
 * Test-only endpoint. Signs the caller in as an existing local account with a
 * single URL visit — `/auth/dev-login?email=alice@example.com[&next=/path]` —
 * so AI agents and e2e can exercise authenticated pages without the
 * magic-link email round-trip: the admin API mints a token hash and the same
 * request verifies it, which writes the session cookies.
 *
 * Never reachable outside local development: production builds, a missing
 * `DEV_LOGIN_ENABLED=true` opt-in, and non-local Supabase URLs all return
 * the same 404 a missing route would.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return notFound();
  }
  if (env.DEV_LOGIN_ENABLED !== "true") {
    return notFound();
  }
  const supabaseHost = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  if (!LOCAL_SUPABASE_HOSTNAMES.includes(supabaseHost)) {
    return notFound();
  }

  const { searchParams } = new URL(request.url);
  const origin = getRequestOrigin(request);
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) {
    next = "/";
  }

  const email = searchParams.get("email");
  const domain = email?.slice(email.lastIndexOf("@") + 1);
  if (!(email && domain && ALLOWED_EMAIL_DOMAINS.includes(domain))) {
    return NextResponse.json(
      {
        error: `email must belong to one of: ${ALLOWED_EMAIL_DOMAINS.map((d) => `@${d}`).join(", ")}`,
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // generateLink("magiclink") silently signs up unknown emails
  // (auth.enable_signup is on locally), so check existence first — a typo
  // must not mint a stray cohortless user. Lookup goes through profiles
  // because the bundled GoTrue's admin listUsers 500s on this stack (see
  // e2e/helpers/supabase-admin.ts).
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json(
      { error: `no user with email ${email} — see supabase/seed.sql` },
      { status: 400 }
    );
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: data.properties.hashed_token,
  });
  if (verifyError) {
    return NextResponse.json({ error: verifyError.message }, { status: 400 });
  }

  return NextResponse.redirect(`${origin}${next}`);
}
