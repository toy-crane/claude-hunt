import { fetchCohorts } from "@features/cohort-filter/server";
import { SettingsForm } from "@features/settings";
import { WithdrawDialog } from "@features/withdraw-user";
import { fetchViewer } from "@shared/api/supabase/viewer";
import { NOINDEX_METADATA } from "@shared/config/site";
import { Card, CardContent } from "@shared/ui/card";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "설정",
  ...NOINDEX_METADATA,
};

export default async function SettingsPage() {
  const [viewer, cohorts] = await Promise.all([fetchViewer(), fetchCohorts()]);
  if (!viewer) {
    redirect("/login?next=/settings");
  }
  const cohortLabel = viewer.cohortId
    ? (cohorts.find((cohort) => cohort.id === viewer.cohortId)?.label ?? null)
    : null;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-8 p-6">
      <h1 className="font-heading font-medium text-2xl">설정</h1>

      <section
        aria-labelledby="settings-profile-heading"
        className="flex flex-col gap-3"
      >
        <h2
          className="px-1 font-medium text-muted-foreground text-xs"
          id="settings-profile-heading"
        >
          프로필 정보
        </h2>
        <Card>
          <CardContent>
            <SettingsForm
              cohortLabel={cohortLabel}
              email={viewer.email}
              initialDisplayName={viewer.displayName ?? ""}
            />
          </CardContent>
        </Card>
      </section>

      <section
        aria-labelledby="settings-danger-heading"
        className="flex flex-col gap-3"
      >
        <h2
          className="px-1 font-medium text-muted-foreground text-xs"
          id="settings-danger-heading"
        >
          위험 영역
        </h2>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-sm">계정 삭제</span>
                <p className="text-muted-foreground text-xs">
                  프로필, 프로젝트, 추천 기록을 영구 삭제합니다. 되돌릴 수
                  없습니다.
                </p>
              </div>
              <WithdrawDialog email={viewer.email} />
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
