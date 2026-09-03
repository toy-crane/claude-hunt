import "server-only";

import { createServerClient } from "@shared/api/supabase/server";
import type { EmailMarketingConsentState } from "../model/schema";

export async function fetchEmailMarketingConsentState(
  userId: string
): Promise<EmailMarketingConsentState> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("email_marketing_consents")
    .select("is_opted_in, decided_at, notice_dismissed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    hasDecision: data?.decided_at !== null && data?.decided_at !== undefined,
    isOptedIn: data?.is_opted_in ?? false,
    noticeDismissed:
      data?.notice_dismissed_at !== null &&
      data?.notice_dismissed_at !== undefined,
  };
}
