import {
  ONBOARDING_DESCRIPTION,
  ONBOARDING_TITLE,
  OnboardingFormSkeleton,
} from "@features/onboarding";
import { AuthLayout } from "@shared/ui/auth-layout";

// Auth-gated page (reads the viewer cookie). This loading UI is the Suspense
// boundary that lets the route prerender under Cache Components while the
// onboarding form streams in. Reuses AuthLayout so the Logo / title / subtitle
// header is pixel-identical to the loaded form — only the body is a skeleton.
export default function Loading() {
  return (
    <AuthLayout description={ONBOARDING_DESCRIPTION} title={ONBOARDING_TITLE}>
      <OnboardingFormSkeleton />
    </AuthLayout>
  );
}
