import { Skeleton } from "@shared/ui/skeleton";

/**
 * Loading placeholder for {@link SubmitForm}. Mirrors the field group
 * (제목 · 한 줄 소개 · 프로젝트 설명 textarea · 프로젝트 URL · GitHub ·
 * 스크린샷 dropzone) and the right-aligned 취소 / 제출 buttons, so the
 * new-project page keeps its height while the form streams in.
 */
export function SubmitFormSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="aspect-[16/10] w-full" />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-16" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  );
}
