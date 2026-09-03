import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setConsent: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("../api/actions", () => ({
  setEmailMarketingConsent: mocks.setConsent,
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

const { EmailNewsSettings } = await import("./email-news-settings");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EmailNewsSettings", () => {
  it("shows the approved value-first copy and saved off state", () => {
    render(<EmailNewsSettings initialOptedIn={false} />);

    expect(screen.getByText("클로드 소식 받기")).toBeInTheDocument();
    expect(
      screen.getByText(
        "클로드를 더 잘 활용하는 데 도움이 되는 뉴스레터와 새로운 강의·이벤트 소식을 보내드려요."
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText("이메일 · 동의 철회 또는 회원 탈퇴 시까지")
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "클로드 소식 받기" })
    ).not.toBeChecked();
  });

  it("lets the member inspect the full marketing consent details", async () => {
    render(<EmailNewsSettings initialOptedIn={false} />);

    await userEvent.click(
      screen.getByRole("button", { name: "마케팅 정보 수신 동의" })
    );

    expect(
      screen.getByText("클로드 신규 기능 및 활용 콘텐츠, 강의·이벤트 안내")
    ).toBeVisible();
    expect(screen.getByText("이메일 주소")).toBeVisible();
    expect(
      screen.getByText("동의하지 않아도 Claude Hunt를 이용할 수 있습니다.")
    ).toBeVisible();
  });

  it("turns on consent immediately and keeps the saved state", async () => {
    mocks.setConsent.mockResolvedValue({ ok: true });
    render(<EmailNewsSettings initialOptedIn={false} />);

    const toggle = screen.getByRole("switch", { name: "클로드 소식 받기" });
    await userEvent.click(toggle);

    await waitFor(() => expect(mocks.setConsent).toHaveBeenCalledWith(true));
    expect(toggle).toBeChecked();
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "클로드 소식 수신을 켰어요."
    );
  });

  it("turns off consent immediately", async () => {
    mocks.setConsent.mockResolvedValue({ ok: true });
    render(<EmailNewsSettings initialOptedIn />);

    const toggle = screen.getByRole("switch", { name: "클로드 소식 받기" });
    await userEvent.click(toggle);

    await waitFor(() => expect(mocks.setConsent).toHaveBeenCalledWith(false));
    expect(toggle).not.toBeChecked();
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "클로드 소식 수신을 껐어요."
    );
  });

  it("restores the prior state when saving fails", async () => {
    mocks.setConsent.mockResolvedValue({
      ok: false,
      error: "permission denied",
    });
    render(<EmailNewsSettings initialOptedIn={false} />);

    const toggle = screen.getByRole("switch", { name: "클로드 소식 받기" });
    await userEvent.click(toggle);

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalled());
    expect(toggle).not.toBeChecked();
  });
});
