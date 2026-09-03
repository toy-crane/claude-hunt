import type { Tables } from "@shared/api/supabase/types";

export type EmailMarketingConsent = Tables<"email_marketing_consents">;

export interface EmailMarketingConsentState {
  hasDecision: boolean;
  isOptedIn: boolean;
  noticeDismissed: boolean;
}
