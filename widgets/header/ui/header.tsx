import { fetchViewer } from "@shared/api/supabase/viewer";
import { Button } from "@shared/ui/button";
import { Logo } from "@shared/ui/logo";
import Link from "next/link";

import { fetchProjectCount } from "../api/fetch-project-count";
import { HeaderMenu } from "./header-menu";
import { HeaderNav } from "./header-nav";
import { HeaderScrollEffect } from "./header-scroll-effect";

export async function Header() {
  const [viewer, projectCount] = await Promise.all([
    fetchViewer(),
    fetchProjectCount(),
  ]);

  return (
    <header className="site-header sticky top-0 z-50 border-b bg-background">
      <HeaderScrollEffect />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Logo />
          <HeaderNav className="hidden md:flex" projectCount={projectCount} />
        </div>
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
      <div className="mx-auto w-full max-w-6xl border-t px-6 md:hidden">
        <HeaderNav projectCount={projectCount} />
      </div>
    </header>
  );
}
