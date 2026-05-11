import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChromeLayout from "./layout";

vi.mock("@widgets/header", () => ({
  Header: () => <div data-testid="site-header-stub" />,
}));

vi.mock("@widgets/footer", () => ({
  Footer: () => <div data-testid="site-footer-stub" />,
}));

describe("(chrome) route group layout", () => {
  it("wraps page children with the site Header and Footer", () => {
    render(
      <ChromeLayout>
        <main data-testid="page-content">page body</main>
      </ChromeLayout>
    );

    expect(screen.getByTestId("site-header-stub")).toBeInTheDocument();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
    expect(screen.getByTestId("site-footer-stub")).toBeInTheDocument();
  });

  it("renders Header before children and Footer after", () => {
    const { container } = render(
      <ChromeLayout>
        <span data-testid="page-content">x</span>
      </ChromeLayout>
    );

    const elements = Array.from(container.querySelectorAll("[data-testid]"));
    const ids = elements.map((el) => el.getAttribute("data-testid"));
    expect(ids).toEqual([
      "site-header-stub",
      "page-content",
      "site-footer-stub",
    ]);
  });
});
