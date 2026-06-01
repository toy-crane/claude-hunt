import { LoginForm, LoginFormSkeleton } from "@features/auth-login";
import { NOINDEX_METADATA } from "@shared/config/site";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = NOINDEX_METADATA;

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
