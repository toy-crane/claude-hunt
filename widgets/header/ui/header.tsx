import { createClient } from "@shared/api/supabase/server.ts";
import { Button } from "@shared/ui/button.tsx";
import { Logo } from "@shared/ui/logo.tsx";
import Link from "next/link";

import { HeaderMenu } from "./header-menu.tsx";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  let avatarUrl: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single();
    displayName = profile?.display_name ?? null;
    avatarUrl = profile?.avatar_url ?? null;
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <Logo />
        {user ? (
          <HeaderMenu avatarUrl={avatarUrl} displayName={displayName} />
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link href="/login">Log in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
