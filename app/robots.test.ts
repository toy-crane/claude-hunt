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

  it("does not disallow any path so per-page noindex tags stay crawlable", () => {
    // Auth-only routes rely on a per-page `noindex` tag instead of a
    // robots.txt disallow. A disallow would block the crawl and stop
    // Googlebot from ever reading that noindex tag, so there must be none.
    const rules = robots().rules;
    if (Array.isArray(rules)) {
      throw new Error("Expected a single rules object, not an array");
    }
    expect(rules.disallow).toBeUndefined();
  });
});
