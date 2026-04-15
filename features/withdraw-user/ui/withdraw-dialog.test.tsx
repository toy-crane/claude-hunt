import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const WITHDRAW_TRIGGER_LABEL = /^탈퇴$/;
const DELETE_ACCOUNT_TITLE = /^계정 삭제$/;
const DELETE_ACCOUNT_BUTTON_NAME = /^계정 삭제$/;
const CANCEL_LABEL = /^취소$/;
const TYPE_PROMPT_REGEX = /확인을 위해 .* 입력해 주세요/;
const LIST_PROFILE_REGEX = /프로필/;
const LIST_PROJECTS_REGEX = /제출한 모든 프로젝트/;
const LIST_VOTES_REGEX = /추천한 모든 기록/;
const LIST_SCREENSHOTS_REGEX = /업로드한 모든 스크린샷/;

const mocks = vi.hoisted(() => ({
  withdrawAccount: vi.fn(),
  routerReplace: vi.fn(),
  routerRefresh: vi.fn(),
}));

vi.mock("../api/actions.ts", () => ({
  withdrawAccount: mocks.withdrawAccount,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mocks.routerReplace,
    refresh: mocks.routerRefresh,
  }),
}));

import { WithdrawDialog } from "./withdraw-dialog";

function renderDialog(email = "alice@example.com") {
  return render(<WithdrawDialog email={email} />);
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: WITHDRAW_TRIGGER_LABEL })
  );
  await screen.findByRole("dialog");
}

function getConfirmButton() {
  return screen.getByTestId("withdraw-confirm") as HTMLButtonElement;
}

describe("<WithdrawDialog />", () => {
  beforeEach(() => {
    mocks.withdrawAccount.mockReset();
    mocks.routerReplace.mockReset();
    mocks.routerRefresh.mockReset();
  });

  it("opens a dialog titled 'Delete account' with a deletion list", async () => {
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);

    expect(
      screen.getByRole("heading", { name: DELETE_ACCOUNT_TITLE })
    ).toBeInTheDocument();
    expect(screen.getByText(LIST_PROFILE_REGEX)).toBeInTheDocument();
    expect(screen.getByText(LIST_PROJECTS_REGEX)).toBeInTheDocument();
    expect(screen.getByText(LIST_VOTES_REGEX)).toBeInTheDocument();
    expect(screen.getByText(LIST_SCREENSHOTS_REGEX)).toBeInTheDocument();
  });

  it("keeps the confirm button disabled for partial matches", async () => {
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);

    const input = screen.getByLabelText(TYPE_PROMPT_REGEX);
    await user.type(input, "alice");

    expect(getConfirmButton()).toBeDisabled();
  });

  it("keeps the confirm button disabled for a wrong-case match", async () => {
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);

    const input = screen.getByLabelText(TYPE_PROMPT_REGEX);
    await user.type(input, "ALICE@EXAMPLE.COM");

    expect(getConfirmButton()).toBeDisabled();
  });

  it("enables the confirm button only on exact email match", async () => {
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);

    const input = screen.getByLabelText(TYPE_PROMPT_REGEX);
    await user.type(input, "alice@example.com");

    expect(getConfirmButton()).toBeEnabled();
  });

  it("disables the confirm button again after clearing the input", async () => {
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);

    const input = screen.getByLabelText(TYPE_PROMPT_REGEX);
    await user.type(input, "alice@example.com");
    expect(getConfirmButton()).toBeEnabled();

    await user.clear(input);
    expect(getConfirmButton()).toBeDisabled();
  });

  it("closes without calling withdrawAccount when Cancel is clicked", async () => {
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);

    const input = screen.getByLabelText(TYPE_PROMPT_REGEX);
    await user.type(input, "alice@example.com");
    await user.click(screen.getByRole("button", { name: CANCEL_LABEL }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mocks.withdrawAccount).not.toHaveBeenCalled();
  });

  it("clears the confirmation input when the dialog is re-opened", async () => {
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);
    await user.type(
      screen.getByLabelText(TYPE_PROMPT_REGEX),
      "alice@example.com"
    );
    await user.click(screen.getByRole("button", { name: CANCEL_LABEL }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    await openDialog(user);

    const input = screen.getByLabelText(TYPE_PROMPT_REGEX) as HTMLInputElement;
    expect(input.value).toBe("");
    expect(getConfirmButton()).toBeDisabled();
  });

  it("navigates to '/' on successful withdrawal", async () => {
    mocks.withdrawAccount.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);
    await user.type(
      screen.getByLabelText(TYPE_PROMPT_REGEX),
      "alice@example.com"
    );
    await user.click(
      screen.getByRole("button", { name: DELETE_ACCOUNT_BUTTON_NAME })
    );

    await waitFor(() => {
      expect(mocks.withdrawAccount).toHaveBeenCalledTimes(1);
    });
    expect(mocks.routerReplace).toHaveBeenCalledWith("/");
  });

  it("surfaces an error and keeps the dialog open on failure", async () => {
    mocks.withdrawAccount.mockResolvedValue({
      ok: false,
      error: "Could not delete account",
    });
    const user = userEvent.setup();
    renderDialog();

    await openDialog(user);
    await user.type(
      screen.getByLabelText(TYPE_PROMPT_REGEX),
      "alice@example.com"
    );
    await user.click(
      screen.getByRole("button", { name: DELETE_ACCOUNT_BUTTON_NAME })
    );

    await waitFor(() => {
      expect(screen.getByTestId("withdraw-error")).toHaveTextContent(
        "Could not delete account"
      );
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mocks.routerReplace).not.toHaveBeenCalled();
  });
});
