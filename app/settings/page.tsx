import { signOut } from "@features/auth-login/index.ts";
import { SettingsForm } from "@features/settings/index.ts";
import { RiArrowLeftLine, RiLogoutBoxRLine } from "@remixicon/react";
import { createClient } from "@shared/api/supabase/server.ts";
import { Button } from "@shared/ui/button.tsx";
import { Separator } from "@shared/ui/separator.tsx";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .single();

  const initialDisplayName = profile?.display_name ?? "";
  const email = profile?.email ?? user.email ?? "";

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-6">
      <Link
        className="inline-flex w-fit items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
        href="/"
      >
        <RiArrowLeftLine className="size-3" />
        <span>Back to home</span>
      </Link>

      <h1 className="font-heading font-medium text-2xl">Settings</h1>

      <SettingsForm email={email} initialDisplayName={initialDisplayName} />

      <Separator />

      <form action={signOut}>
        <Button type="submit" variant="outline">
          <RiLogoutBoxRLine />
          <span>Log out</span>
        </Button>
      </form>
    </main>
  );
}
