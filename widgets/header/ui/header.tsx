import { fetchViewer } from "@shared/api/supabase/viewer";
import { Button } from "@shared/ui/button";
import { Logo } from "@shared/ui/logo";
import Link from "next/link";

import { HeaderMenu } from "./header-menu";

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
            <Link href="/login">로그인</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
