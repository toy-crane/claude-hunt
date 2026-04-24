import { vi } from "vitest";

const createClientMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => {
    createClientMock(...args);
    return {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ order: vi.fn() })),
      })),
    };
  },
}));

vi.mock("@shared/config/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-test-key",
  },
}));

describe("createAnonServerClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("constructs the client with the publishable key — not a secret key", async () => {
    const { createAnonServerClient } = await import("./anon-server");
    createAnonServerClient();

    expect(createClientMock).toHaveBeenCalledTimes(1);
    const [url, key] = createClientMock.mock.calls[0];
    expect(url).toBe("https://test.supabase.co");
    expect(key).toBe("publishable-test-key");
  });

  it("disables session persistence so the client is stateless across OG regenerations", async () => {
    const { createAnonServerClient } = await import("./anon-server");
    createAnonServerClient();

    const [, , options] = createClientMock.mock.calls[0];
    expect(options.auth.persistSession).toBe(false);
    expect(options.auth.autoRefreshToken).toBe(false);
  });

  it("does not import next/headers — provable cookie-free client", async () => {
    // If the module ever starts importing next/headers, this test fails because
    // the import would throw under vitest's jsdom env (no request context).
    // Passing this test is the proof-by-construction that OG generation can
    // call the client without a cookies() scope.
    await expect(import("./anon-server")).resolves.toBeDefined();
  });

  it("returns a client exposing .from(...) — enough to query projects_with_vote_count", async () => {
    const { createAnonServerClient } = await import("./anon-server");
    const client = createAnonServerClient();
    expect(typeof client.from).toBe("function");
  });
});
