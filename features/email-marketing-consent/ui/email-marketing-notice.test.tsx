import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dismissNotice: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("../api/actions", () => ({
  dismissEmailMarketingNotice: mocks.dismissNotice,
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError },
}));

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

const { EmailMarketingNotice } = await import("./email-marketing-notice");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EmailMarketingNotice", () => {
  it("offers the approved one-time prompt and links to email settings", () => {
    render(<EmailMarketingNotice />);

    expect(screen.getByText("클로드 소식도 받아보세요")).toBeInTheDocument();
    expect(
      screen.getByText(
        "클로드를 더 잘 활용하는 데 도움이 되는 뉴스레터와 새로운 강의·이벤트 소식을 이메일로 보내드려요."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "설정에서 선택" })).toHaveAttribute(
      "href",
      "/settings#email-news"
    );
  });

  it("dismisses permanently without treating it as consent", async () => {
    mocks.dismissNotice.mockResolvedValue({ ok: true });
    render(<EmailMarketingNotice />);

    await userEvent.click(screen.getByRole("button", { name: "나중에" }));

    await waitFor(() => expect(mocks.dismissNotice).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByRole("complementary", { name: "클로드 소식 안내" })
    ).not.toBeInTheDocument();
  });

  it("keeps the prompt visible when dismissal cannot be saved", async () => {
    mocks.dismissNotice.mockResolvedValue({
      ok: false,
      error: "permission denied",
    });
    render(<EmailMarketingNotice />);

    await userEvent.click(screen.getByRole("button", { name: "나중에" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalled());
    expect(
      screen.getByRole("complementary", { name: "클로드 소식 안내" })
    ).toBeInTheDocument();
  });
});
