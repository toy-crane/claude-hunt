import { Skeleton } from "@shared/ui/skeleton";

/**
 * Loading placeholder for {@link EditForm}. Same field group as the
 * submit form, but with the edit form's denser `gap-4` outer spacing and
 * its 취소 / 저장(flex-1) action row. The screenshot area is shown as the
 * common single 16:10 block.
 */
export function EditFormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="aspect-[16/10] w-full" />
        </div>
      </div>

      <div className="flex items-stretch gap-2">
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 flex-1" />
      </div>
    </div>
  );
}
