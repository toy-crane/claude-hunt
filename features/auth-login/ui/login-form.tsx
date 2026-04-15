"use client";

import { createClient } from "@shared/api/supabase/client";
import { AuthLayout } from "@shared/ui/auth-layout";
import { Button } from "@shared/ui/button";
import { GitHubIcon } from "@shared/ui/icons/github";
import { GoogleIcon } from "@shared/ui/icons/google";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const supabase = createClient();
  const searchParams = useSearchParams();

  function buildCallbackUrl() {
    const base = `${window.location.origin}/auth/callback`;
    const next = searchParams.get("next");
    if (next?.startsWith("/")) {
      return `${base}?next=${encodeURIComponent(next)}`;
    }
    return base;
  }

  async function handleOAuthLogin(provider: "github" | "google") {
    setLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: buildCallbackUrl(),
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
        emailRedirectTo: buildCallbackUrl(),
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
    <AuthLayout description="자유롭게 프로젝트를 공유해 보세요" title="로그인">
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
            또는 이메일로 계속하기
          </span>
          <hr className="border-dashed" />
        </div>

        {otpSent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm">
              <strong>{email}</strong> 으로 매직 링크를 보냈어요. 이메일을
              확인하고 로그인해 주세요.
            </p>
            <Button
              onClick={() => {
                setOtpSent(false);
                setEmail("");
              }}
              type="button"
              variant="link"
            >
              다른 이메일로 시도
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="block text-sm" htmlFor="email">
                이메일
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
              {loading === "email" ? "보내는 중..." : "계속하기"}
            </Button>
          </div>
        )}

        <p className="mt-6 text-center text-muted-foreground text-xs">
          계속 진행하면{" "}
          <Link className="underline hover:text-foreground" href="/terms">
            서비스 이용약관
          </Link>{" "}
          과{" "}
          <Link className="underline hover:text-foreground" href="/privacy">
            개인정보 처리방침
          </Link>
          에 동의하는 것으로 간주됩니다.
        </p>
      </form>
    </AuthLayout>
  );
}
