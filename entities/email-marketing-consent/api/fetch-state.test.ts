import { beforeEach, describe, expect, it, vi } from "vitest";

const from = vi.fn();
const mockClient = { from };

vi.mock("@shared/api/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue(mockClient),
}));

const { fetchEmailMarketingConsentState } = await import("./fetch-state");

function stubQuery(options: {
  data: {
    decided_at: string | null;
    is_opted_in: boolean;
    notice_dismissed_at: string | null;
  } | null;
  error?: { message: string };
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: options.data,
    error: options.error ?? null,
  });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  from.mockReturnValue({ select });
  return { eq, select };
}

beforeEach(() => {
  from.mockReset();
});

describe("fetchEmailMarketingConsentState", () => {
  it("returns an undecided opt-out state when the member has no row", async () => {
    stubQuery({ data: null });

    await expect(fetchEmailMarketingConsentState("user-1")).resolves.toEqual({
      hasDecision: false,
      isOptedIn: false,
      noticeDismissed: false,
    });
  });

  it("reads the member's saved decision and scopes the query by user id", async () => {
    const { eq, select } = stubQuery({
      data: {
        decided_at: "2026-09-03T00:00:00Z",
        is_opted_in: true,
        notice_dismissed_at: null,
      },
    });

    await expect(fetchEmailMarketingConsentState("user-1")).resolves.toEqual({
      hasDecision: true,
      isOptedIn: true,
      noticeDismissed: false,
    });
    expect(select).toHaveBeenCalledWith(
      "is_opted_in, decided_at, notice_dismissed_at"
    );
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("keeps dismissal separate from an explicit consent decision", async () => {
    stubQuery({
      data: {
        decided_at: null,
        is_opted_in: false,
        notice_dismissed_at: "2026-09-03T00:00:00Z",
      },
    });

    await expect(fetchEmailMarketingConsentState("user-1")).resolves.toEqual({
      hasDecision: false,
      isOptedIn: false,
      noticeDismissed: true,
    });
  });

  it("throws when the consent state query fails", async () => {
    stubQuery({ data: null, error: { message: "permission denied" } });

    await expect(
      fetchEmailMarketingConsentState("user-1")
    ).rejects.toMatchObject({ message: "permission denied" });
  });
});
