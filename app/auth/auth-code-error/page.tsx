import { Button } from "@shared/ui/button";
import Link from "next/link";

export default function AuthCodeError() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <h1 className="font-medium text-lg">인증 오류</h1>
      <p className="text-muted-foreground text-sm">
        로그인 중에 문제가 발생했어요. 다시 시도해 주세요.
      </p>
      <Button asChild variant="outline">
        <Link href="/login">로그인으로 돌아가기</Link>
      </Button>
    </div>
  );
}
