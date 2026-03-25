import Link from "next/link";
import { signOut } from "@/app/auth/actions.ts";
import { Button } from "@/components/ui/button.tsx";
import { createClient } from "@/lib/supabase/server.ts";

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = !!data?.claims;

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex min-w-0 max-w-md flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>You may now add components and start building.</p>
          <p>We&apos;ve already added the button component for you.</p>
          <div className="mt-2 flex gap-2">
            {isLoggedIn ? (
              <form action={signOut}>
                <Button type="submit" variant="outline">
                  Sign out
                </Button>
              </form>
            ) : (
              <Button asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
        <div className="font-mono text-muted-foreground text-xs">
          (Press <kbd>d</kbd> to toggle dark mode)
        </div>
      </div>
    </div>
  );
}
