import { signOut } from "@features/auth-login/index.ts";
import { SettingsForm } from "@features/settings/index.ts";
import { WithdrawDialog } from "@features/withdraw-user/index.ts";
import { RiArrowLeftLine, RiLogoutBoxRLine } from "@remixicon/react";
import { fetchViewer } from "@shared/api/supabase/viewer.ts";
import { Button } from "@shared/ui/button.tsx";
import { Card, CardContent } from "@shared/ui/card.tsx";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Settings",
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
          <span>Back to home</span>
        </Link>

        <h1 className="font-heading font-medium text-2xl">Settings</h1>
      </div>

      <section
        aria-labelledby="settings-profile-heading"
        className="flex flex-col gap-3"
      >
        <h2
          className="px-1 font-medium text-muted-foreground text-xs"
          id="settings-profile-heading"
        >
          Profile
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
        aria-labelledby="settings-account-heading"
        className="flex flex-col gap-3"
      >
        <h2
          className="px-1 font-medium text-muted-foreground text-xs"
          id="settings-account-heading"
        >
          Account
        </h2>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-sm">Log out</span>
              <form action={signOut}>
                <Button type="submit" variant="outline">
                  <RiLogoutBoxRLine data-icon="inline-start" />
                  <span>Log out</span>
                </Button>
              </form>
            </div>
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
          Danger Zone
        </h2>
        <Card>
          <CardContent>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-sm">Delete account</span>
                <p className="text-muted-foreground text-xs">
                  Permanently remove your profile, projects, and votes. This
                  cannot be undone.
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
