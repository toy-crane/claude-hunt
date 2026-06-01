import { Skeleton } from "@shared/ui/skeleton";

// Auth-gated page (reads the viewer cookie). This loading UI is the Suspense
// boundary that lets the route prerender under Cache Components while the
// onboarding form streams in.
export default function Loading() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </main>
  );
}
