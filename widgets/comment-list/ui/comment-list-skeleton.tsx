import { Skeleton } from "@shared/ui/skeleton";

const COMMENT_ROW_KEYS = ["row-1", "row-2", "row-3"];

/**
 * Loading placeholder for {@link CommentList}. Mirrors the section
 * header, the composer (textarea + submit), and a few comment rows so
 * the comment area keeps its height while threads stream in.
 */
export function CommentListSkeleton() {
  return (
    <section className="flex flex-col gap-4">
      <Skeleton className="h-5 w-16" />

      <div className="flex flex-col gap-2">
        <Skeleton className="h-20 w-full" />
        <div className="flex justify-end">
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      <ul className="flex flex-col divide-y">
        {COMMENT_ROW_KEYS.map((key) => (
          <li className="flex gap-3 py-3" key={key}>
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
