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

const fetchProjectCountMock = vi.fn();

vi.mock("../api/fetch-project-count", () => ({
  fetchProjectCount: (...args: unknown[]) => fetchProjectCountMock(...args),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

// The viewer-dependent cluster reads cookies and is covered by
// header-viewer-slice.test.tsx. Stub it here so the static shell renders
// synchronously without hitting the auth session.
vi.mock("./header-viewer-slice", () => ({
  HeaderViewerSlice: () => (
    <div data-testid="header-viewer-slice-stub">viewer slice</div>
  ),
}));

describe("<Header />", () => {
  beforeEach(() => {
    fetchProjectCountMock.mockReset();
    fetchProjectCountMock.mockResolvedValue(45);
  });

  it("renders the claude-hunt logo linking to /", async () => {
    const { Header } = await import("./header");
    const jsx = await Header();
    render(jsx);

    const logo = screen.getByRole("link", { name: LOGO_LABEL });
    expect(logo).toHaveAttribute("href", "/");
  });

  it("renders the project count badge from the cached count", async () => {
    const { Header } = await import("./header");
    const jsx = await Header();
    render(jsx);

    expect(screen.getAllByText("45").length).toBeGreaterThan(0);
  });

  it("renders the viewer slice (not viewer data) so the shell stays static", async () => {
    const { Header } = await import("./header");
    const jsx = await Header();
    render(jsx);

    expect(
      screen.getAllByTestId("header-viewer-slice-stub").length
    ).toBeGreaterThan(0);
    // The shell itself must not read the auth session.
    expect(fetchProjectCountMock).toHaveBeenCalled();
  });
});
