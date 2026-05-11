import robots from "./robots";

describe("robots", () => {
  it("declares the sitemap URL so crawlers can discover it", () => {
    expect(robots().sitemap).toBe("https://www.claude-hunt.com/sitemap.xml");
  });

  it("allows the site root for all user agents", () => {
    const rules = robots().rules;
    if (Array.isArray(rules)) {
      throw new Error("Expected a single rules object, not an array");
    }
    expect(rules.userAgent).toBe("*");
    expect(rules.allow).toBe("/");
  });

  it("disallows auth-only routes that should not appear in search results", () => {
    const rules = robots().rules;
    if (Array.isArray(rules)) {
      throw new Error("Expected a single rules object, not an array");
    }
    expect(rules.disallow).toEqual(
      expect.arrayContaining([
        "/login",
        "/onboarding",
        "/settings",
        "/projects/new",
        "/projects/*/edit",
        "/auth/",
      ])
    );
  });
});
