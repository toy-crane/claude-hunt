import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const LOGO_LABEL = /claude-hunt 홈/;

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

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

const fetchProjectCountMock = vi.fn();
vi.mock("../api/fetch-project-count", () => ({
  fetchProjectCount: (...args: unknown[]) => fetchProjectCountMock(...args),
}));

// The viewer-specific corner reads the auth cookie and is exercised in
// header-viewer-slot.test.tsx. Stub it here so the static shell renders
// synchronously without suspending on `fetchViewer()`.
vi.mock("./header-viewer-slot", () => ({
  HeaderViewerSlot: () => <div data-testid="header-viewer-slot-stub" />,
  HeaderAuthFallback: () => <div data-testid="header-auth-fallback-stub" />,
}));

describe("<Header />", () => {
  beforeEach(() => {
    fetchProjectCountMock.mockReset().mockResolvedValue(45);
  });

  it("renders the claude-hunt logo linking to /", async () => {
    const { Header } = await import("./header");
    render(await Header());

    const logo = screen.getByRole("link", { name: LOGO_LABEL });
    expect(logo).toHaveAttribute("href", "/");
  });

  it("renders the nav with the total project count", async () => {
    const { Header } = await import("./header");
    render(await Header());

    // HeaderNav renders the count in both the desktop and mobile navs.
    expect(screen.getAllByText("45").length).toBeGreaterThan(0);
  });

  it("hardens the sticky header against iOS Safari navigation flicker", async () => {
    // Forward nav: own view-transition-name keeps it out of the root snapshot
    // (paired CSS in app/globals.css). Back nav (no view transition): GPU-layer
    // promotion stops Safari from re-rasterizing the sticky header when
    // cacheComponents toggles the previous route to display:none.
    const { Header } = await import("./header");
    render(await Header());

    const banner = screen.getByRole("banner");
    expect(banner.className).toContain("[view-transition-name:site-header]");
    expect(banner.className).toContain("[transform:translateZ(0)]");
    expect(banner.className).toContain("[backface-visibility:hidden]");
  });
});
