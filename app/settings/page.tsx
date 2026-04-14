import { signOut } from "@features/auth-login/index.ts";
import { SettingsForm } from "@features/settings/index.ts";
import { RiArrowLeftLine, RiLogoutBoxRLine } from "@remixicon/react";
import { fetchViewer } from "@shared/api/supabase/viewer.ts";
import { Button } from "@shared/ui/button.tsx";
import { Separator } from "@shared/ui/separator.tsx";
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
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-6">
      <Link
        className="inline-flex w-fit items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
        href="/"
      >
        <RiArrowLeftLine />
        <span>Back to home</span>
      </Link>

      <h1 className="font-heading font-medium text-2xl">Settings</h1>

      <SettingsForm
        email={viewer.email}
        initialDisplayName={viewer.displayName ?? ""}
      />

      <Separator />

      <form action={signOut}>
        <Button type="submit" variant="outline">
          <RiLogoutBoxRLine data-icon="inline-start" />
          <span>Log out</span>
        </Button>
      </form>
    </main>
  );
}
