import {
  DISPLAY_NAME_POLICY_MESSAGE,
  DISPLAY_NAME_REQUIRED_MESSAGE,
} from "@entities/profile";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SAVE_LABEL = /저장/;
const DUPLICATE_MESSAGE = /이미 사용 중인 닉네임이에요/;

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
  props?: Partial<{
    cohortLabel: string | null;
    email: string;
    initialDisplayName: string;
  }>
) {
  return render(
    <SettingsForm
      cohortLabel={props?.cohortLabel}
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

  it("renders the cohort label as a disabled field when provided", () => {
    renderForm({ cohortLabel: "2기" });

    const cohort = screen.getByLabelText("클래스") as HTMLInputElement;
    expect(cohort).toBeDisabled();
    expect(cohort.value).toBe("2기");
  });

  it("omits the cohort field when cohortLabel is not provided", () => {
    renderForm();

    expect(screen.queryByLabelText("클래스")).not.toBeInTheDocument();
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
    await user.type(input, "Bob_123");
    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(mocks.updateDisplayName).toHaveBeenCalledWith("Bob_123");
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("닉네임을 변경했어요.");
    expect(mocks.routerRefresh).toHaveBeenCalledTimes(1);
    expect((input as HTMLInputElement).value).toBe("Bob_123");
  });

  it("trims surrounding whitespace before passing the value to the action", async () => {
    mocks.updateDisplayName.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText("닉네임");
    await user.clear(input);
    await user.type(input, "  Alice  ");
    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(mocks.updateDisplayName).toHaveBeenCalledWith("Alice");
    });
  });

  it("blocks client-side and shows the required message for an empty value (action not called)", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.clear(screen.getByLabelText("닉네임"));
    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(
        screen.getByText(DISPLAY_NAME_REQUIRED_MESSAGE)
      ).toBeInTheDocument();
    });
    expect(mocks.updateDisplayName).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it("blocks client-side and shows the required message for whitespace-only input", async () => {
    const user = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText("닉네임");
    await user.clear(input);
    await user.type(input, "   ");
    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(
        screen.getByText(DISPLAY_NAME_REQUIRED_MESSAGE)
      ).toBeInTheDocument();
    });
    expect(mocks.updateDisplayName).not.toHaveBeenCalled();
  });

  it("blocks client-side and shows the policy message when the value exceeds 12 chars", async () => {
    const user = userEvent.setup();
    renderForm({ initialDisplayName: "A".repeat(13) });

    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(screen.getByText(DISPLAY_NAME_POLICY_MESSAGE)).toBeInTheDocument();
    });
    expect(mocks.updateDisplayName).not.toHaveBeenCalled();
  });

  it("blocks client-side and shows the policy message for special characters", async () => {
    const user = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText("닉네임");
    await user.clear(input);
    await user.type(input, "Alice!");
    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(screen.getByText(DISPLAY_NAME_POLICY_MESSAGE)).toBeInTheDocument();
    });
    expect(mocks.updateDisplayName).not.toHaveBeenCalled();
  });

  it("preserves the entered value in the input after a validation error", async () => {
    const user = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText("닉네임") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Alice!");
    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(screen.getByText(DISPLAY_NAME_POLICY_MESSAGE)).toBeInTheDocument();
    });
    expect(input.value).toBe("Alice!");
  });

  it("surfaces the server duplicate error when the action reports unique violation", async () => {
    mocks.updateDisplayName.mockResolvedValue({
      ok: false,
      error: { field: "displayName", message: "이미 사용 중인 닉네임이에요." },
    });
    const user = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText("닉네임");
    await user.clear(input);
    await user.type(input, "alice");
    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(screen.getByText(DUPLICATE_MESSAGE)).toBeInTheDocument();
    });
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it("self-save: succeeds when the server accepts the user's own current nickname (any case)", async () => {
    mocks.updateDisplayName.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderForm({ initialDisplayName: "Alice" });

    const input = screen.getByLabelText("닉네임");
    await user.clear(input);
    await user.type(input, "alice");
    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(mocks.updateDisplayName).toHaveBeenCalledWith("alice");
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("닉네임을 변경했어요.");
    expect(screen.queryByText(DUPLICATE_MESSAGE)).not.toBeInTheDocument();
  });

  it("displays a legacy non-compliant stored nickname without auto-erroring on mount", () => {
    renderForm({ initialDisplayName: "x" });

    const input = screen.getByLabelText("닉네임") as HTMLInputElement;
    expect(input.value).toBe("x");
    expect(
      screen.queryByText(DISPLAY_NAME_POLICY_MESSAGE)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(DISPLAY_NAME_REQUIRED_MESSAGE)
    ).not.toBeInTheDocument();
  });

  it("shows a Spinner on the Save button while pending and keeps the static label", async () => {
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
      const button = screen.getByRole("button", { name: SAVE_LABEL });
      expect(button).toBeDisabled();
      expect(button.querySelector('[role="status"]')).toBeInTheDocument();
      expect(button.textContent).toContain("저장");
      expect(button.textContent).not.toContain("저장 중");
    });

    resolveUpdate({ ok: true });
  });
});
