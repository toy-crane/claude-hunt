"use client";

import { RiGithubFill, RiGoogleFill } from "@remixicon/react";
import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { FieldDescription } from "@/components/ui/field.tsx";
import { createClient } from "@/lib/supabase/client.ts";
import { cn } from "@/lib/utils.ts";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleOAuthLogin(provider: "github" | "google") {
    setLoading(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error("OAuth error:", error.message);
      setLoading(null);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome</CardTitle>
          <CardDescription>
            Sign in with your GitHub or Google account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Button
              disabled={loading !== null}
              onClick={() => handleOAuthLogin("github")}
              variant="outline"
            >
              <RiGithubFill className="size-4" />
              {loading === "github" ? "Redirecting..." : "Continue with GitHub"}
            </Button>
            <Button
              disabled={loading !== null}
              onClick={() => handleOAuthLogin("google")}
              variant="outline"
            >
              <RiGoogleFill className="size-4" />
              {loading === "google" ? "Redirecting..." : "Continue with Google"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{" "}
        <a href="/terms">Terms of Service</a> and{" "}
        <a href="/privacy">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
