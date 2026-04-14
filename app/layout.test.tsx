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
});
