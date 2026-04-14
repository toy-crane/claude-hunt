import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import AuthCodeError from "./page";

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

describe("auth-error", () => {
  it("displays error heading, message, and back link", () => {
    render(<AuthCodeError />);

    expect(
      screen.getByRole("heading", { name: "Authentication Error" })
    ).toBeInTheDocument();

    expect(
      screen.getByText("Something went wrong during sign-in. Please try again.")
    ).toBeInTheDocument();

    const backLink = screen.getByRole("link", { name: "Back to login" });
    expect(backLink).toHaveAttribute("href", "/login");
  });
});
