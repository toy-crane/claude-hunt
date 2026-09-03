"use client";

import { EMAIL_NEWS_DESCRIPTION } from "@entities/email-marketing-consent";
import { Button } from "@shared/ui/button";
import { Card, CardContent } from "@shared/ui/card";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { dismissEmailMarketingNotice } from "../api/actions";

export function EmailMarketingNotice() {
  const [isVisible, setIsVisible] = useState(true);
  const [isPending, startTransition] = useTransition();

  function handleDismiss() {
    startTransition(async () => {
      const result = await dismissEmailMarketingNotice();
      if (!result.ok) {
        toast.error("안내를 닫지 못했어요. 다시 시도해 주세요.");
        return;
      }
      setIsVisible(false);
    });
  }

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      aria-label="클로드 소식 안내"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-xl"
    >
      <Card className="shadow-lg" size="sm">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-1">
            <p className="font-medium text-sm">클로드 소식도 받아보세요</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {EMAIL_NEWS_DESCRIPTION}
            </p>
          </div>
          <div className="flex shrink-0 justify-end gap-2">
            <Button
              disabled={isPending}
              onClick={handleDismiss}
              size="sm"
              type="button"
              variant="ghost"
            >
              나중에
            </Button>
            <Button asChild size="sm">
              <Link href="/settings#email-news">설정에서 선택</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
