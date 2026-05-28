import { SubmitForm } from "@features/submit-project";
import { fetchViewer } from "@shared/api/supabase/viewer";
import { NOINDEX_METADATA } from "@shared/config/site";
import { sanitizeNextPath } from "@shared/lib/safe-next-path";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = NOINDEX_METADATA;

interface PageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

const NEW_PROJECT_DEFAULT_BACK = "__default__";

export default async function Page({ searchParams }: PageProps) {
  const [viewer, { next }] = await Promise.all([fetchViewer(), searchParams]);
  if (!viewer) {
    redirect("/login");
  }

  // Sentinel-based opt-in: when no `next` is supplied we let SubmitForm
  // fall back to the project detail page (which we don't know until the
  // server action returns the new id). Only override when the caller
  // explicitly passes a same-origin path.
  const resolvedNext = sanitizeNextPath(next, NEW_PROJECT_DEFAULT_BACK);
  const backHref =
    resolvedNext === NEW_PROJECT_DEFAULT_BACK ? undefined : resolvedNext;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 bg-background px-6 pt-6 pb-24 text-foreground">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading font-medium text-2xl">프로젝트 제출</h1>
        <p className="text-muted-foreground text-sm">
          제출하면 상세 페이지가 만들어지고 보드에 노출돼요.
        </p>
      </header>
      <SubmitForm backHref={backHref} cohortId={viewer.cohortId} />
    </main>
  );
}
