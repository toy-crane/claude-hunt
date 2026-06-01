import { Skeleton } from "@shared/ui/skeleton";

/**
 * Loading placeholder for the {@link OnboardingForm} body. Rendered
 * inside `AuthLayout` by the route's `loading.tsx`, so the Logo / title
 * / subtitle header is the real shell and only the form fields, submit,
 * divider, and sign-out button are skeletonized.
 */
export function OnboardingFormSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* FieldGroup: 닉네임 + 클래스 (gap-7, each field stacks label + control at gap-3) */}
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>

      {/* 계속하기 */}
      <Skeleton className="h-9 w-full" />

      {/* 구분선 · 또는 */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="h-px bg-border" />
        <Skeleton className="h-3 w-6" />
        <div className="h-px bg-border" />
      </div>

      {/* 로그아웃 */}
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
