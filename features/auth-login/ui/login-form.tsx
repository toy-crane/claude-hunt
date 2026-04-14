"use client";

import { createClient } from "@shared/api/supabase/client.ts";
import { AuthLayout } from "@shared/ui/auth-layout.tsx";
import { Button } from "@shared/ui/button.tsx";
import { GitHubIcon } from "@shared/ui/icons/github.tsx";
import { GoogleIcon } from "@shared/ui/icons/google.tsx";
import { Input } from "@shared/ui/input.tsx";
import { Label } from "@shared/ui/label.tsx";
import Link from "next/link";
import { useState } from "react";

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
    <AuthLayout
      description="Sign in to your account to continue"
      title="Welcome back"
    >
      <form onSubmit={handleEmailLogin}>
        <div className="grid grid-cols-2 gap-3">
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
    </AuthLayout>
  );
}
