import { EMAIL_MARKETING_CONSENT_VERSION } from "@entities/email-marketing-consent";
import { createMockSupabaseClient } from "@shared/lib/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const mockClient = {
  ...createMockSupabaseClient(),
  rpc,
};

vi.mock("@shared/api/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue(mockClient),
}));

const refreshMock = vi.fn();
vi.mock("next/cache", () => ({ refresh: refreshMock }));

const { dismissEmailMarketingNotice, setEmailMarketingConsent } = await import(
  "./actions"
);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(mockClient.auth.getClaims).mockResolvedValue({
    data: { claims: { sub: "user-1", email: "alice@example.com" } },
    error: null,
  });
  rpc.mockResolvedValue({ data: null, error: null });
});

describe("email marketing consent actions", () => {
  it("records an authenticated member opt-in with the current copy version", async () => {
    const result = await setEmailMarketingConsent(true);

    expect(result).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("set_email_marketing_consent", {
      p_consent_version: EMAIL_MARKETING_CONSENT_VERSION,
      p_opted_in: true,
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("records an authenticated member withdrawal", async () => {
    const result = await setEmailMarketingConsent(false);

    expect(result).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("set_email_marketing_consent", {
      p_consent_version: EMAIL_MARKETING_CONSENT_VERSION,
      p_opted_in: false,
    });
  });

  it("rejects a signed-out consent change without touching the database", async () => {
    vi.mocked(mockClient.auth.getClaims).mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await setEmailMarketingConsent(true);

    expect(result.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns a database error without refreshing the route", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    const result = await setEmailMarketingConsent(true);

    expect(result).toEqual({ ok: false, error: "permission denied" });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("dismisses the legacy notice without turning on consent", async () => {
    const result = await dismissEmailMarketingNotice();

    expect(result).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("dismiss_email_marketing_notice");
    expect(refreshMock).toHaveBeenCalled();
  });
});
