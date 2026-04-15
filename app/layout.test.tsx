import { vi } from "vitest";

// next/font/google is a Turbopack-transformed module; in vitest we stub
// each font factory to return the same shape at runtime.
vi.mock("next/font/google", () => {
  const stub = () => ({
    className: "font-stub",
    variable: "--font-stub",
    style: { fontFamily: "stub" },
  });
  return { Inter: stub, Geist_Mono: stub, JetBrains_Mono: stub };
});

// ThemeProvider touches next-themes; not the subject of this test.
vi.mock("@core/providers/theme-provider.tsx", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const { metadata } = await import("./layout");

const ENGLISH_TAGLINE = /Discover|cohort|showcase/i;

describe("app/layout metadata", () => {
  it("sets the default title to 'claude-hunt'", () => {
    expect(metadata.title).toEqual(
      expect.objectContaining({
        default: "claude-hunt",
      })
    );
  });

  it("uses a title template ending in '· claude-hunt'", () => {
    expect(metadata.title).toEqual(
      expect.objectContaining({
        template: "%s · claude-hunt",
      })
    );
  });

  it("uses the Korean tagline as the description", () => {
    expect(metadata.description).toBe("함께 배우는 사람들의 프로젝트");
  });

  it("sets an openGraph title containing 'claude-hunt'", () => {
    const og = metadata.openGraph;
    expect(og).toBeDefined();
    expect(String(og?.title)).toContain("claude-hunt");
  });

  it("sets the openGraph description to the Korean tagline", () => {
    expect(metadata.openGraph?.description).toBe(
      "함께 배우는 사람들의 프로젝트"
    );
  });

  it("sets a twitter title containing 'claude-hunt'", () => {
    const tw = metadata.twitter;
    expect(tw).toBeDefined();
    expect(String(tw?.title)).toContain("claude-hunt");
  });

  it("sets the twitter description to the Korean tagline", () => {
    const twitter = metadata.twitter as { description?: string };
    expect(twitter.description).toBe("함께 배우는 사람들의 프로젝트");
  });

  it("does not leak English copy in description fields", () => {
    expect(metadata.description).not.toMatch(ENGLISH_TAGLINE);
    expect(String(metadata.openGraph?.description)).not.toMatch(
      ENGLISH_TAGLINE
    );
    const twitter = metadata.twitter as { description?: string };
    expect(twitter.description).not.toMatch(ENGLISH_TAGLINE);
  });

  it("uses 'summary_large_image' twitter card so the OG image renders full-bleed", () => {
    const twitter = metadata.twitter as { card?: string } | null | undefined;
    expect(twitter?.card).toBe("summary_large_image");
  });

  it("sets metadataBase to the production origin so OG/Twitter image URLs resolve absolute", () => {
    const base = metadata.metadataBase;
    expect(base).toBeInstanceOf(URL);
    expect((base as URL).origin).toBe("https://www.claude-hunt.com");
  });

  it("allows search engines to index and follow via robots directives", () => {
    const robots = metadata.robots as
      | { index?: boolean; follow?: boolean }
      | null
      | undefined;
    expect(robots?.index).toBe(true);
    expect(robots?.follow).toBe(true);
  });

  it("declares a canonical URL pointing to site root so query-string variants collapse", () => {
    expect(metadata.alternates?.canonical).toBe("/");
  });

  it("includes the site-relevant keywords required by the spec", () => {
    expect(metadata.keywords).toEqual(
      expect.arrayContaining([
        "Claude Code",
        "cohort projects",
        "AI coding",
        "showcase",
      ])
    );
  });
});
