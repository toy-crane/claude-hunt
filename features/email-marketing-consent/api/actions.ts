"use server";

import { EMAIL_MARKETING_CONSENT_VERSION } from "@entities/email-marketing-consent";
import { requireAuth } from "@shared/api/supabase/require-auth";
import { refresh } from "next/cache";

export type EmailMarketingConsentActionResult =
  | { ok: true }
  | { error: string; ok: false };

export async function setEmailMarketingConsent(
  optedIn: boolean
): Promise<EmailMarketingConsentActionResult> {
  const auth = await requireAuth("로그인이 풀렸어요. 다시 로그인해 주세요.");
  if (!auth.ok) {
    return auth;
  }

  const { error } = await auth.supabase.rpc("set_email_marketing_consent", {
    p_consent_version: EMAIL_MARKETING_CONSENT_VERSION,
    p_opted_in: optedIn,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  refresh();
  return { ok: true };
}

export async function dismissEmailMarketingNotice(): Promise<EmailMarketingConsentActionResult> {
  const auth = await requireAuth("로그인이 풀렸어요. 다시 로그인해 주세요.");
  if (!auth.ok) {
    return auth;
  }

  const { error } = await auth.supabase.rpc("dismiss_email_marketing_notice");

  if (error) {
    return { ok: false, error: error.message };
  }

  refresh();
  return { ok: true };
}
