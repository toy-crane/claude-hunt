import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@shared/config/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
  },
}));

const getUser = vi.fn();
const profileSingle = vi.fn();

const mockClient = {
  auth: { getUser },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: profileSingle,
      }),
    }),
  }),
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn().mockReturnValue(mockClient),
}));

const { proxy, config, isOnboardingBypassPath } = await import("./proxy.ts");

function buildRequest(path: string) {
  return new NextRequest(new URL(path, "http://app.test"));
}

beforeEach(() => {
  getUser.mockReset();
  profileSingle.mockReset();
});

describe("proxy — onboarding gate", () => {
  it("passes through unauthenticated requests (public browsing allowed)", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await proxy(buildRequest("/"));

    expect(res.headers.get("location")).toBeNull();
  });

  it("passes through authed users whose profile already has a cohort", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    profileSingle.mockResolvedValue({
      data: { cohort_id: "a1" },
      error: null,
    });

    const res = await proxy(buildRequest("/"));

    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects authed-no-cohort user on '/' to /onboarding?next=/", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    profileSingle.mockResolvedValue({ data: { cohort_id: null }, error: null });

    const res = await proxy(buildRequest("/"));

    expect(res.headers.get("location")).toBe(
      "http://app.test/onboarding?next=%2F"
    );
  });

  it("preserves path + search in next when bouncing a deep link", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    profileSingle.mockResolvedValue({ data: { cohort_id: null }, error: null });

    const res = await proxy(buildRequest("/anything?x=1"));

    expect(res.headers.get("location")).toBe(
      "http://app.test/onboarding?next=%2Fanything%3Fx%3D1"
    );
  });

  it("does NOT loop when authed-no-cohort user is already on /onboarding", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    profileSingle.mockResolvedValue({ data: { cohort_id: null }, error: null });

    const res = await proxy(buildRequest("/onboarding"));

    expect(res.headers.get("location")).toBeNull();
  });

  it("does not redirect authed-no-cohort user away from /login", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    profileSingle.mockResolvedValue({ data: { cohort_id: null }, error: null });

    const res = await proxy(buildRequest("/login"));

    expect(res.headers.get("location")).toBeNull();
  });

  it("does not redirect authed-no-cohort user away from /auth/callback", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    profileSingle.mockResolvedValue({ data: { cohort_id: null }, error: null });

    const res = await proxy(buildRequest("/auth/callback?code=abc"));

    expect(res.headers.get("location")).toBeNull();
  });

  it("re-bounces a previously onboarded user whose cohort has been deleted", async () => {
    // Simulates ON DELETE SET NULL on profiles.cohort_id
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    profileSingle.mockResolvedValue({ data: { cohort_id: null }, error: null });

    const res = await proxy(buildRequest("/"));

    expect(res.headers.get("location")).toBe(
      "http://app.test/onboarding?next=%2F"
    );
  });
});

// The framework compiles config.matcher into a request-URL matcher. For
// unit tests we verify the pattern itself (as a standard JS regex) so a
// matcher misconfiguration is caught without standing up Next.js.
const MATCHER_RE = new RegExp(`^${config.matcher[0]}$`);

describe("proxy matcher config", () => {
  it("matches regular app routes (so middleware runs)", () => {
    expect(MATCHER_RE.test("/")).toBe(true);
    expect(MATCHER_RE.test("/onboarding")).toBe(true);
    expect(MATCHER_RE.test("/login")).toBe(true);
    expect(MATCHER_RE.test("/anything")).toBe(true);
  });

  it("excludes Next.js internal paths and common asset extensions", () => {
    expect(MATCHER_RE.test("/_next/static/chunk.js")).toBe(false);
    expect(MATCHER_RE.test("/_next/image")).toBe(false);
    expect(MATCHER_RE.test("/favicon.ico")).toBe(false);
    expect(MATCHER_RE.test("/logo.png")).toBe(false);
    expect(MATCHER_RE.test("/hero.jpg")).toBe(false);
    expect(MATCHER_RE.test("/icon.svg")).toBe(false);
    expect(MATCHER_RE.test("/photo.webp")).toBe(false);
  });
});

describe("isOnboardingBypassPath", () => {
  it("returns true for /onboarding, /login, /auth/*", () => {
    expect(isOnboardingBypassPath("/onboarding")).toBe(true);
    expect(isOnboardingBypassPath("/login")).toBe(true);
    expect(isOnboardingBypassPath("/auth/callback")).toBe(true);
    expect(isOnboardingBypassPath("/auth/auth-code-error")).toBe(true);
  });

  it("returns false for regular app paths", () => {
    expect(isOnboardingBypassPath("/")).toBe(false);
    expect(isOnboardingBypassPath("/anything")).toBe(false);
    expect(isOnboardingBypassPath("/some/deep/path")).toBe(false);
  });
});
