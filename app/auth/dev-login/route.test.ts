import { createMockSupabaseClient } from "@shared/lib/test-utils";
import { vi } from "vitest";

const mockEnv: {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  SUPABASE_SECRET_KEY: string;
  DEV_LOGIN_ENABLED: string | undefined;
} = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
  SUPABASE_SECRET_KEY: "test-secret-key",
  DEV_LOGIN_ENABLED: "true",
};

vi.mock("@shared/config/env", () => ({ env: mockEnv }));

const mockClient = createMockSupabaseClient();

vi.mock("@shared/api/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue(mockClient),
}));

const generateLink = vi.fn();
const profileMaybeSingle = vi.fn();

const adminClient = {
  auth: { admin: { generateLink } },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle }),
    }),
  }),
};

vi.mock("@shared/api/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue(adminClient),
}));

describe("dev-login route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockEnv.DEV_LOGIN_ENABLED = "true";
    mockEnv.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    profileMaybeSingle.mockResolvedValue({
      data: { id: "user-1" },
      error: null,
    });
    generateLink.mockResolvedValue({
      data: { properties: { hashed_token: "hash-1" }, user: {} },
      error: null,
    });
    mockClient.auth.verifyOtp = vi.fn().mockResolvedValue({
      data: { user: {}, session: {} },
      error: null,
    });
  });

  it("returns 404 on production builds without touching the admin API", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://app.test/auth/dev-login?email=alice@example.com")
    );

    expect(res.status).toBe(404);
    expect(generateLink).not.toHaveBeenCalled();
    expect(profileMaybeSingle).not.toHaveBeenCalled();
  });

  it("returns 404 when DEV_LOGIN_ENABLED is unset", async () => {
    mockEnv.DEV_LOGIN_ENABLED = undefined;

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://app.test/auth/dev-login?email=alice@example.com")
    );

    expect(res.status).toBe(404);
    expect(generateLink).not.toHaveBeenCalled();
  });

  it("returns 404 when DEV_LOGIN_ENABLED is any value other than 'true' (fails closed)", async () => {
    mockEnv.DEV_LOGIN_ENABLED = "false";

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://app.test/auth/dev-login?email=alice@example.com")
    );

    expect(res.status).toBe(404);
    expect(generateLink).not.toHaveBeenCalled();
  });

  it("returns 404 when the Supabase URL is not local", async () => {
    mockEnv.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://app.test/auth/dev-login?email=alice@example.com")
    );

    expect(res.status).toBe(404);
    expect(generateLink).not.toHaveBeenCalled();
  });

  it("returns 400 when the email param is missing", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request("http://app.test/auth/dev-login"));

    expect(res.status).toBe(400);
    expect(profileMaybeSingle).not.toHaveBeenCalled();
  });

  it("returns 400 for an email outside the allowed domains", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://app.test/auth/dev-login?email=x@gmail.com")
    );

    expect(res.status).toBe(400);
    expect(profileMaybeSingle).not.toHaveBeenCalled();
    expect(generateLink).not.toHaveBeenCalled();
  });

  it("returns 400 for an unknown user without generating a link (no auto-signup)", async () => {
    profileMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://app.test/auth/dev-login?email=ghost@example.com")
    );

    expect(res.status).toBe(400);
    expect(generateLink).not.toHaveBeenCalled();
  });

  it("returns 500 when the profiles lookup fails", async () => {
    profileMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://app.test/auth/dev-login?email=alice@example.com")
    );

    expect(res.status).toBe(500);
    expect(generateLink).not.toHaveBeenCalled();
  });

  it("returns 400 when generateLink fails", async () => {
    generateLink.mockResolvedValue({
      data: { properties: null, user: null },
      error: { message: "boom" },
    });

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://app.test/auth/dev-login?email=alice@example.com")
    );

    expect(res.status).toBe(400);
    expect(mockClient.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("returns 400 when verifyOtp fails", async () => {
    mockClient.auth.verifyOtp = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "expired" },
    });

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://app.test/auth/dev-login?email=alice@example.com")
    );

    expect(res.status).toBe(400);
  });

  it("verifies the minted token hash and redirects to '/' by default", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://app.test/auth/dev-login?email=alice@example.com")
    );

    expect(generateLink).toHaveBeenCalledWith({
      type: "magiclink",
      email: "alice@example.com",
    });
    expect(mockClient.auth.verifyOtp).toHaveBeenCalledWith({
      type: "email",
      token_hash: "hash-1",
    });
    expect(res.headers.get("location")).toBe("http://app.test/");
  });

  it("redirects to origin + next when next is a local path", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      new Request(
        "http://app.test/auth/dev-login?email=alice@example.com&next=/settings"
      )
    );

    expect(res.headers.get("location")).toBe("http://app.test/settings");
  });

  it("sanitizes non-local next param to '/'", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      new Request(
        "http://app.test/auth/dev-login?email=alice@example.com&next=https://evil.com"
      )
    );

    expect(res.headers.get("location")).toBe("http://app.test/");
  });

  it("redirects to the forwarded origin when behind a reverse proxy", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      new Request(
        "https://localhost:4293/auth/dev-login?email=alice@example.com",
        {
          headers: {
            "x-forwarded-host": "wt.claude-hunt.localhost",
            "x-forwarded-proto": "https",
          },
        }
      )
    );

    expect(res.headers.get("location")).toBe(
      "https://wt.claude-hunt.localhost/"
    );
  });

  it("accepts the e2e test.local domain", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://app.test/auth/dev-login?email=e2e-1@test.local")
    );

    expect(generateLink).toHaveBeenCalledWith({
      type: "magiclink",
      email: "e2e-1@test.local",
    });
    expect(res.headers.get("location")).toBe("http://app.test/");
  });
});
