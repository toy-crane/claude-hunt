import { AuthLayout } from "@shared/ui/auth-layout";
import { Skeleton } from "@shared/ui/skeleton";
import { LOGIN_DESCRIPTION, LOGIN_TITLE } from "../copy";

/**
 * Full-page loading placeholder for {@link LoginForm}. Reuses AuthLayout
 * so the Logo / title / subtitle header is identical to the loaded form,
 * then skeletonizes the OAuth buttons, the divider, the email field, and
 * the terms footer (the default, pre-OTP layout).
 */
export function LoginFormSkeleton() {
  return (
    <AuthLayout description={LOGIN_DESCRIPTION} title={LOGIN_TITLE}>
      <div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>

        <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <hr className="border-dashed" />
          <Skeleton className="h-3 w-36" />
          <hr className="border-dashed" />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-9 w-full" />
        </div>

        <div className="mt-6 flex flex-col items-center gap-1">
          <Skeleton className="h-3 w-full max-w-64" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    </AuthLayout>
  );
}
