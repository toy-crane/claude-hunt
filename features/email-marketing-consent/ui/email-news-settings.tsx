"use client";

import {
  EMAIL_NEWS_SETTINGS_DESCRIPTION,
  EmailMarketingConsentDetails,
} from "@entities/email-marketing-consent";
import { Switch } from "@shared/ui/switch";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setEmailMarketingConsent } from "../api/actions";

export interface EmailNewsSettingsProps {
  initialOptedIn: boolean;
}

export function EmailNewsSettings({ initialOptedIn }: EmailNewsSettingsProps) {
  const [isOptedIn, setIsOptedIn] = useState(initialOptedIn);
  const [isPending, startTransition] = useTransition();

  function handleCheckedChange(nextValue: boolean) {
    const previousValue = isOptedIn;
    setIsOptedIn(nextValue);

    startTransition(async () => {
      const result = await setEmailMarketingConsent(nextValue);
      if (!result.ok) {
        setIsOptedIn(previousValue);
        toast.error("수신 설정을 바꾸지 못했어요. 다시 시도해 주세요.");
        return;
      }

      toast.success(
        nextValue ? "클로드 소식 수신을 켰어요." : "클로드 소식 수신을 껐어요."
      );
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <label className="font-medium text-sm" htmlFor="email-news-toggle">
            클로드 소식 받기
          </label>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {EMAIL_NEWS_SETTINGS_DESCRIPTION}
          </p>
        </div>
        <Switch
          aria-label="클로드 소식 받기"
          checked={isOptedIn}
          disabled={isPending}
          id="email-news-toggle"
          onCheckedChange={handleCheckedChange}
        />
      </div>
      <EmailMarketingConsentDetails label="마케팅 정보 수신 동의" />
    </div>
  );
}
