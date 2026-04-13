import { createMockSupabaseClient } from "@shared/lib/test-utils.tsx";
import { vi } from "vitest";

const mockClient = createMockSupabaseClient();

vi.mock("@shared/api/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
}));

describe("auth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.auth.exchangeCodeForSession = vi
      .fn()
      .mockResolvedValue({ error: null });
  });

  it("S-AUTH-CALLBACK-001: redirects to origin + next when next is a local path", async () => {
    const { GET } = await import("./route.ts");
    const res = await GET(
      new Request("http://app.test/auth/callback?code=abc&next=/dashboard")
    );

    expect(res.headers.get("location")).toBe("http://app.test/dashboard");
  });

  it("S-AUTH-CALLBACK-002: sanitizes non-local next param to '/'", async () => {
    const { GET } = await import("./route.ts");
    const res = await GET(
      new Request(
        "http://app.test/auth/callback?code=abc&next=https://evil.com"
      )
    );

    expect(res.headers.get("location")).toBe("http://app.test/");
  });

  it("S-AUTH-CALLBACK-003: falls back to '/' when next param is missing", async () => {
    const { GET } = await import("./route.ts");
    const res = await GET(
      new Request("http://app.test/auth/callback?code=abc")
    );

    expect(res.headers.get("location")).toBe("http://app.test/");
  });

  it("S-AUTH-CALLBACK-004: redirects to /auth/auth-code-error when exchange returns an error", async () => {
    mockClient.auth.exchangeCodeForSession = vi
      .fn()
      .mockResolvedValue({ error: { message: "invalid_grant" } });

    const { GET } = await import("./route.ts");
    const res = await GET(
      new Request("http://app.test/auth/callback?code=abc&next=/dashboard")
    );

    expect(res.headers.get("location")).toBe(
      "http://app.test/auth/auth-code-error"
    );
  });

  it("S-AUTH-CALLBACK-005: redirects to /auth/auth-code-error when code is missing", async () => {
    const { GET } = await import("./route.ts");
    const res = await GET(new Request("http://app.test/auth/callback"));

    expect(res.headers.get("location")).toBe(
      "http://app.test/auth/auth-code-error"
    );
    expect(mockClient.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
