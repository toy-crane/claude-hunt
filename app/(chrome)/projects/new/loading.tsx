import { SubmitFormSkeleton } from "@features/submit-project";
import { Skeleton } from "@shared/ui/skeleton";

// Auth-gated page (reads the viewer cookie). This loading UI is the Suspense
// boundary that lets the chrome shell prerender under Cache Components while
// the submit form streams in. Mirrors the header (h1 + subtitle) and the
// submit form so the page doesn't jump when the form arrives.
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 px-6 pt-6 pb-24">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <SubmitFormSkeleton />
    </main>
  );
}
