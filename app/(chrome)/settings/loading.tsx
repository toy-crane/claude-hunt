import { Skeleton } from "@shared/ui/skeleton";

// Auth-gated page: it reads the viewer cookie, so the route is dynamic.
// This loading UI is the Suspense boundary that lets the chrome shell
// prerender under Cache Components while the page body streams in.
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-8 p-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-48 w-full" />
    </main>
  );
}
