import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { Logo } from "./logo.tsx";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const TERRACOTTA_LIGHT = "#c15f3c";
const TERRACOTTA_DARK = "#e88a67";

/** WCAG relative luminance. */
function relativeLuminance(hex: string): number {
  const n = hex.replace("#", "");
  const rgb = [0, 2, 4].map(
    (i) => Number.parseInt(n.slice(i, i + 2), 16) / 255
  );
  const srgb = rgb.map((c) =>
    c <= 0.039_28 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

describe("Logo", () => {
  it("renders the visible text '> claude-hunt_'", () => {
    render(<Logo />);
    // Parts may be split across spans; assert each character group is present.
    expect(screen.getByText(">")).toBeInTheDocument();
    expect(screen.getByText("claude-hunt")).toBeInTheDocument();
    expect(screen.getByText("_")).toBeInTheDocument();
  });

  it("is an anchor to / with aria-label 'claude-hunt home'", () => {
    render(<Logo />);
    const link = screen.getByRole("link", { name: "claude-hunt home" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("applies terracotta light/dark classes to '>' and '_' glyphs", () => {
    render(<Logo />);
    const prompt = screen.getByText(">");
    const cursor = screen.getByText("_");
    for (const el of [prompt, cursor]) {
      expect(el.className).toContain(`text-[${TERRACOTTA_LIGHT}]`);
      expect(el.className).toContain(`dark:text-[${TERRACOTTA_DARK}]`);
    }
  });

  it("uses a monospace font on the wordmark", () => {
    render(<Logo />);
    const link = screen.getByRole("link", { name: "claude-hunt home" });
    expect(link.className).toContain("font-mono");
  });

  it("does not animate the cursor by default", () => {
    render(<Logo />);
    const cursor = screen.getByText("_");
    expect(cursor.style.animationName).toBe("");
  });

  it("animates the cursor with a 1-second duration when blink is true", () => {
    render(<Logo blink />);
    const cursor = screen.getByText("_");
    expect(cursor.style.animationName).toBe("logo-cursor-blink");
    expect(cursor.style.animationDuration).toBe("1s");
    expect(cursor.style.animationIterationCount).toBe("infinite");
  });

  it("terracotta has contrast ratio >= 3:1 against both white and black", () => {
    // Non-text graphic WCAG AA threshold is 3:1.
    expect(contrastRatio(TERRACOTTA_LIGHT, "#ffffff")).toBeGreaterThanOrEqual(
      3
    );
    expect(contrastRatio(TERRACOTTA_LIGHT, "#000000")).toBeGreaterThanOrEqual(
      3
    );
  });
});
