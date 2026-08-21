import { LoginForm, LoginFormSkeleton } from "@features/auth-login";
import { NOINDEX_METADATA } from "@shared/config/site";
import type { Metadata } from "next";
import { Suspense } from "react";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = NOINDEX_METADATA;

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
