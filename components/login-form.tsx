"use client";

import Link from "next/link";
import { useState } from "react";
import { GitHubIcon } from "@/components/icons/github.tsx";
import { GoogleIcon } from "@/components/icons/google.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { createClient } from "@/lib/supabase/client.ts";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const supabase = createClient();

  async function handleOAuthLogin(provider: "github" | "google") {
    setLoading(provider);
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

  async function handleEmailLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading("email");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error("OTP error:", error.message);
      setLoading(null);
      return;
    }
    setOtpSent(true);
    setLoading(null);
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      <form className="w-full max-w-sm" onSubmit={handleEmailLogin}>
        <div>
          <Link aria-label="go home" href="/">
            <span className="font-bold text-xl">Claude Hunt</span>
          </Link>
          <h1 className="mt-4 mb-1 font-semibold text-xl">Welcome back</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to your account to continue
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button
            disabled={loading !== null}
            onClick={() => handleOAuthLogin("github")}
            type="button"
            variant="outline"
          >
            <GitHubIcon className="size-4" />
            <span>GitHub</span>
          </Button>
          <Button
            disabled={loading !== null}
            onClick={() => handleOAuthLogin("google")}
            type="button"
            variant="outline"
          >
            <GoogleIcon className="size-4" />
            <span>Google</span>
          </Button>
        </div>

        <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <hr className="border-dashed" />
          <span className="text-muted-foreground text-xs">
            Or continue with
          </span>
          <hr className="border-dashed" />
        </div>

        {otpSent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm">
              We sent a magic link to <strong>{email}</strong>. Check your email
              to sign in.
            </p>
            <Button
              onClick={() => {
                setOtpSent(false);
                setEmail("");
              }}
              type="button"
              variant="link"
            >
              Try another email
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="block text-sm" htmlFor="email">
                Email
              </Label>
              <Input
                disabled={loading !== null}
                id="email"
                name="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </div>
            <Button className="w-full" disabled={loading !== null}>
              {loading === "email" ? "Sending..." : "Continue"}
            </Button>
          </div>
        )}

        <p className="mt-6 text-center text-muted-foreground text-xs">
          By continuing, you agree to our{" "}
          <Link className="underline hover:text-foreground" href="/terms">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link className="underline hover:text-foreground" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </section>
  );
}
