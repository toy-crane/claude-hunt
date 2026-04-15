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
      screen.getByRole("heading", { name: "인증 오류" })
    ).toBeInTheDocument();

    expect(
      screen.getByText("로그인 중에 문제가 발생했어요. 다시 시도해 주세요.")
    ).toBeInTheDocument();

    const backLink = screen.getByRole("link", { name: "로그인으로 돌아가기" });
    expect(backLink).toHaveAttribute("href", "/login");
  });
});
