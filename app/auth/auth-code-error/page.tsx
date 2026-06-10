import { NOINDEX_METADATA } from "@shared/config/site";
import { Button } from "@shared/ui/button";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = NOINDEX_METADATA;

export default function AuthCodeError() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <h1 className="font-medium text-lg">로그인하지 못했어요</h1>
      <p className="text-muted-foreground text-sm">
        잠시 문제가 생겼어요. 다시 시도해 주세요.
      </p>
      <Button asChild variant="outline">
        <Link href="/login">로그인으로 돌아가기</Link>
      </Button>
    </div>
  );
}
