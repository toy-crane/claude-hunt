import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const WITHDRAW_TRIGGER_LABEL = /^withdraw$/i;
const DELETE_ACCOUNT_TITLE = /^delete account$/i;
const DELETE_ACCOUNT_BUTTON_NAME = /^delete account$/i;
const CANCEL_LABEL = /^cancel$/i;
const TYPE_PROMPT_REGEX = /type .* to confirm/i;
const LIST_PROFILE_REGEX = /your profile/i;
const LIST_PROJECTS_REGEX = /projects you have submitted/i;
const LIST_VOTES_REGEX = /votes you have cast/i;
const LIST_SCREENSHOTS_REGEX = /uploaded screenshots/i;

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

import { WithdrawDialog } from "./withdraw-dialog.tsx";

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
