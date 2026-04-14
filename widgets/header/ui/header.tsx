import { createClient } from "@shared/api/supabase/server.ts";
import { Button } from "@shared/ui/button.tsx";
import { Logo } from "@shared/ui/logo.tsx";
import Link from "next/link";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <Logo />
        {user ? null : (
          <Button asChild size="sm" variant="outline">
            <Link href="/login">Log in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
