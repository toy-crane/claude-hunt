import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AuthLayout } from "./auth-layout.tsx";

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

const REQUIRED_SECTION_CLASSES = [
  "flex",
  "min-h-screen",
  "items-center",
  "justify-center",
  "bg-zinc-50",
  "px-4",
  "py-16",
  "md:py-32",
  "dark:bg-transparent",
];

/** Return each element's position in pre-order DOM traversal of `root`. */
function indexIn(root: HTMLElement, element: Element): number {
  const all = Array.from(root.querySelectorAll("*"));
  return all.indexOf(element);
}

describe("AuthLayout", () => {
  it("renders exactly one h1 with the title", () => {
    const { container } = render(
      <AuthLayout description="D" title="My page">
        <span>body</span>
      </AuthLayout>
    );
    const headings = container.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe("My page");
  });

  it("renders a subtitle paragraph after the h1 in DOM order", () => {
    const { container } = render(
      <AuthLayout description="Sub text" title="T">
        <span>body</span>
      </AuthLayout>
    );
    const heading = screen.getByRole("heading", { level: 1 });
    const subtitle = screen.getByText("Sub text");
    expect(indexIn(container, subtitle)).toBeGreaterThan(
      indexIn(container, heading)
    );
  });

  it("renders the Logo link before the h1 in DOM order", () => {
    const { container } = render(
      <AuthLayout description="D" title="T">
        <span>body</span>
      </AuthLayout>
    );
    const heading = screen.getByRole("heading", { level: 1 });
    const logoLink = screen.getByRole("link", { name: "claude-hunt home" });
    expect(logoLink).toHaveAttribute("href", "/");
    expect(indexIn(container, logoLink)).toBeLessThan(
      indexIn(container, heading)
    );
  });

  it("blinks the Logo cursor (1s, logo-cursor-blink, infinite)", () => {
    render(
      <AuthLayout description="D" title="T">
        <span>body</span>
      </AuthLayout>
    );
    const cursor = screen.getByText("_");
    expect(cursor.style.animationName).toBe("logo-cursor-blink");
    expect(cursor.style.animationDuration).toBe("1s");
    expect(cursor.style.animationIterationCount).toBe("infinite");
  });

  it("renders arbitrary children below the subtitle", () => {
    const { container } = render(
      <AuthLayout description="D" title="T">
        <span data-testid="child-sentinel">hello body</span>
      </AuthLayout>
    );
    const subtitle = screen.getByText("D");
    const child = screen.getByTestId("child-sentinel");
    expect(child).toBeInTheDocument();
    expect(indexIn(container, child)).toBeGreaterThan(
      indexIn(container, subtitle)
    );
  });

  it("applies the shared page-shell classes to the outer section", () => {
    const { container } = render(
      <AuthLayout description="D" title="T">
        <span>body</span>
      </AuthLayout>
    );
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    for (const cls of REQUIRED_SECTION_CLASSES) {
      expect(section?.className).toContain(cls);
    }
  });

  it("wraps content in a max-w-sm container", () => {
    const { container } = render(
      <AuthLayout description="D" title="T">
        <span>body</span>
      </AuthLayout>
    );
    const inner = container.querySelector("section > div");
    expect(inner?.className).toContain("max-w-sm");
    expect(inner?.className).toContain("w-full");
  });
});
