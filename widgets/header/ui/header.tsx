import { fetchViewer } from "@shared/api/supabase/viewer.ts";
import { Button } from "@shared/ui/button.tsx";
import { Logo } from "@shared/ui/logo.tsx";
import Link from "next/link";

import { HeaderMenu } from "./header-menu.tsx";

export async function Header() {
  const viewer = await fetchViewer();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <Logo />
        {viewer ? (
          <HeaderMenu
            avatarUrl={viewer.avatarUrl}
            displayName={viewer.displayName}
          />
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link href="/login">Log in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
