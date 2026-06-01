import { Skeleton } from "@shared/ui/skeleton";

// Auth-gated page (reads the viewer cookie). This loading UI is the Suspense
// boundary that lets the chrome shell prerender under Cache Components while
// the edit form streams in.
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </main>
  );
}
