import { SettingsForm } from "@features/settings";
import { WithdrawDialog } from "@features/withdraw-user";
import { RiArrowLeftLine } from "@remixicon/react";
import { fetchViewer } from "@shared/api/supabase/viewer";
import { Card, CardContent } from "@shared/ui/card";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "설정",
};

export default async function SettingsPage() {
  const viewer = await fetchViewer();
  if (!viewer) {
    redirect("/login?next=/settings");
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-8 p-6">
      <div className="flex flex-col gap-6">
        <Link
          className="inline-flex w-fit items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
          href="/"
        >
          <RiArrowLeftLine />
          <span>홈으로 돌아가기</span>
        </Link>

        <h1 className="font-heading font-medium text-2xl">설정</h1>
      </div>

      <section
        aria-labelledby="settings-profile-heading"
        className="flex flex-col gap-3"
      >
        <h2
          className="px-1 font-medium text-muted-foreground text-xs"
          id="settings-profile-heading"
        >
          프로필
        </h2>
        <Card>
          <CardContent>
            <SettingsForm
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
