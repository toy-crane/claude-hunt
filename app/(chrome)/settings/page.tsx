import { fetchCohorts } from "@features/cohort-filter/server";
import { DeleteButton } from "@features/delete-project";
import {
  fetchMyProjects,
  type MyProjectRow,
  MyProjectsList,
} from "@features/my-projects";
import { SettingsForm } from "@features/settings";
import { WithdrawDialog } from "@features/withdraw-user";
import { RiAddLine, RiPencilLine } from "@remixicon/react";
import { fetchViewer } from "@shared/api/supabase/viewer";
import { NOINDEX_METADATA } from "@shared/config/site";
import { Button } from "@shared/ui/button";
import { Card, CardContent } from "@shared/ui/card";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "설정",
  ...NOINDEX_METADATA,
};

function renderProjectRowActions(project: MyProjectRow) {
  const projectId = project.id ?? "";
  const title = project.title ?? "";
  return (
    <>
      <Button
        aria-label="프로젝트 수정"
        asChild
        size="icon-sm"
        variant="outline"
      >
        <Link href={`/projects/${projectId}/edit?from=settings`}>
          <RiPencilLine className="size-3.5" />
        </Link>
      </Button>
      <DeleteButton projectId={projectId} projectTitle={title} variant="icon" />
    </>
  );
}

export default async function SettingsPage() {
  const viewer = await fetchViewer();
  if (!viewer) {
    redirect("/login?next=/settings");
  }
  // fetchCohorts is viewer-agnostic and fetchMyProjects only needs
  // viewer.id, so they run in parallel — same waterfall reduction
  // pattern as the previous fetchViewer/fetchCohorts pairing.
  const [cohorts, myProjects] = await Promise.all([
    fetchCohorts(),
    fetchMyProjects(viewer.id),
  ]);

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
              cohorts={cohorts}
              email={viewer.email}
              initialCohortId={viewer.cohortId}
              initialDisplayName={viewer.displayName ?? ""}
            />
          </CardContent>
        </Card>
      </section>

      <section
        aria-labelledby="settings-projects-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-2 px-1">
          <h2
            className="font-medium text-muted-foreground text-xs"
            id="settings-projects-heading"
          >
            내 프로젝트{" "}
            <span className="font-mono font-normal">· {myProjects.length}</span>
          </h2>
          <Button asChild size="sm">
            <Link href="/projects/new?from=settings">
              <RiAddLine />새 프로젝트
            </Link>
          </Button>
        </div>
        <MyProjectsList
          projects={myProjects}
          renderActions={renderProjectRowActions}
        />
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
                  프로필, 프로젝트, 추천 기록을 영구 삭제해요. 되돌릴 수 없어요.
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
