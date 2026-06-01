import { EditFormSkeleton } from "@features/edit-project";
import { Skeleton } from "@shared/ui/skeleton";

// Auth-gated page (reads the viewer cookie). This loading UI is the Suspense
// boundary that lets the chrome shell prerender under Cache Components while
// the edit form streams in. Leads with the back link (the real page's first
// element), then the header and the edit form.
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-6">
      <Skeleton className="h-4 w-40" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <EditFormSkeleton />
    </main>
  );
}
