import { vi } from "vitest";

// next/font/google is a Turbopack-transformed module; in vitest we stub
// each font factory to return the same shape at runtime.
vi.mock("next/font/google", () => {
  const stub = () => ({
    className: "font-stub",
    variable: "--font-stub",
    style: { fontFamily: "stub" },
  });
  return { Noto_Sans: stub, Geist_Mono: stub };
});

// ThemeProvider touches next-themes; not the subject of this test.
vi.mock("@core/providers/theme-provider.tsx", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const { metadata } = await import("./layout.tsx");

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

  it("has a description present", () => {
    expect(metadata.description).toBeTruthy();
  });

  it("sets an openGraph title containing 'claude-hunt'", () => {
    const og = metadata.openGraph;
    expect(og).toBeDefined();
    expect(String(og?.title)).toContain("claude-hunt");
  });

  it("sets a twitter title containing 'claude-hunt'", () => {
    const tw = metadata.twitter;
    expect(tw).toBeDefined();
    expect(String(tw?.title)).toContain("claude-hunt");
  });

  it("uses 'summary_large_image' twitter card so the OG image renders full-bleed", () => {
    expect(metadata.twitter?.card).toBe("summary_large_image");
  });
});
