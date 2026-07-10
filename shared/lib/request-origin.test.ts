import { getRequestOrigin } from "./request-origin";

describe("getRequestOrigin", () => {
  it("prefers x-forwarded-host and x-forwarded-proto over the request URL", () => {
    const request = new Request("https://localhost:4293/auth/dev-login", {
      headers: {
        "x-forwarded-host": "wt.claude-hunt.localhost",
        "x-forwarded-proto": "https",
      },
    });

    expect(getRequestOrigin(request)).toBe("https://wt.claude-hunt.localhost");
  });

  it("falls back to the request URL's protocol when only the host is forwarded", () => {
    const request = new Request("http://localhost:3000/auth/callback", {
      headers: { "x-forwarded-host": "wt.claude-hunt.localhost" },
    });

    expect(getRequestOrigin(request)).toBe("http://wt.claude-hunt.localhost");
  });

  it("returns the request URL's origin when no forwarded headers are present", () => {
    const request = new Request("http://localhost:3000/auth/callback?code=x");

    expect(getRequestOrigin(request)).toBe("http://localhost:3000");
  });
});
