import { Skeleton } from "@shared/ui/skeleton";

const FIELD_KEYS = ["email", "cohort", "display-name"];

/**
 * Loading placeholder for {@link SettingsForm}. Mirrors the field group
 * (이메일 · 클래스 · 닉네임) and the right-aligned 저장 button. Sized for
 * the common case where the viewer has a cohort (3 fields).
 */
export function SettingsFormSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-7">
        {FIELD_KEYS.map((key) => (
          <div className="flex flex-col gap-3" key={key}>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-9 w-16" />
      </div>
    </div>
  );
}
