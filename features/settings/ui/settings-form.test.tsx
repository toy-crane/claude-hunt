import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SAVE_LABEL = /^저장$/;
const SAVING_LABEL = /저장 중/;
const REQUIRED_MESSAGE = /닉네임을 입력해 주세요/;
const LENGTH_MESSAGE = /50자 이하/;

const mocks = vi.hoisted(() => ({
  updateDisplayName: vi.fn(),
  routerRefresh: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("../api/actions.ts", () => ({
  updateDisplayName: mocks.updateDisplayName,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.routerRefresh }),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess },
}));

import { SettingsForm } from "./settings-form";

function renderForm(
  props?: Partial<{ email: string; initialDisplayName: string }>
) {
  return render(
    <SettingsForm
      email={props?.email ?? "alice@example.com"}
      initialDisplayName={props?.initialDisplayName ?? "Alice"}
    />
  );
}

describe("<SettingsForm />", () => {
  beforeEach(() => {
    mocks.updateDisplayName.mockReset();
    mocks.routerRefresh.mockReset();
    mocks.toastSuccess.mockReset();
  });

  it("pre-fills the display-name input with the current value", () => {
    renderForm();

    const input = screen.getByLabelText("닉네임") as HTMLInputElement;
    expect(input.value).toBe("Alice");
  });

  it("renders the email input disabled with the viewer's email", () => {
    renderForm();

    const email = screen.getByLabelText("이메일") as HTMLInputElement;
    expect(email).toBeDisabled();
    expect(email.value).toBe("alice@example.com");
  });

  it("renders the Email field before the Display name field", () => {
    renderForm();

    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>("input")
    );
    const emailIndex = inputs.findIndex((el) => el.type === "email");
    const displayNameIndex = inputs.findIndex(
      (el) => el.getAttribute("name") === "displayName"
    );
    expect(emailIndex).toBeGreaterThanOrEqual(0);
    expect(displayNameIndex).toBeGreaterThan(emailIndex);
  });

  it("has no Save control attached to the email field", () => {
    renderForm();

    const saveButtons = screen.getAllByRole("button", { name: SAVE_LABEL });
    expect(saveButtons).toHaveLength(1);
  });

  it("calls updateDisplayName with the typed value and shows a success toast", async () => {
    mocks.updateDisplayName.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText("닉네임");
    await user.clear(input);
    await user.type(input, "Alice K.");
    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(mocks.updateDisplayName).toHaveBeenCalledWith("Alice K.");
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("닉네임이 변경되었어요.");
    expect(mocks.routerRefresh).toHaveBeenCalledTimes(1);
    expect((input as HTMLInputElement).value).toBe("Alice K.");
  });

  it("shows 'Display name is required' when the action rejects an empty value", async () => {
    mocks.updateDisplayName.mockResolvedValue({
      ok: false,
      error: { field: "displayName", message: "닉네임을 입력해 주세요." },
    });
    const user = userEvent.setup();
    renderForm();

    await user.clear(screen.getByLabelText("닉네임"));
    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(screen.getByText(REQUIRED_MESSAGE)).toBeInTheDocument();
    });
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it("shows 'Display name is required' for a whitespace-only value", async () => {
    mocks.updateDisplayName.mockResolvedValue({
      ok: false,
      error: { field: "displayName", message: "닉네임을 입력해 주세요." },
    });
    const user = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText("닉네임");
    await user.clear(input);
    await user.type(input, "   ");
    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(screen.getByText(REQUIRED_MESSAGE)).toBeInTheDocument();
    });
    expect(mocks.updateDisplayName).toHaveBeenCalledWith("   ");
  });

  it("shows the length error when the display name exceeds 50 characters", async () => {
    mocks.updateDisplayName.mockResolvedValue({
      ok: false,
      error: {
        field: "displayName",
        message: "닉네임은 50자 이하로 입력해 주세요.",
      },
    });
    const user = userEvent.setup();
    renderForm({ initialDisplayName: "A".repeat(51) });

    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(screen.getByText(LENGTH_MESSAGE)).toBeInTheDocument();
    });
  });

  it("disables the Save button while the action is pending", async () => {
    let resolveUpdate: (value: { ok: true }) => void = () => undefined;
    mocks.updateDisplayName.mockImplementation(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          resolveUpdate = resolve;
        })
    );
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: SAVING_LABEL })).toBeDisabled();
    });

    resolveUpdate({ ok: true });
  });
});
