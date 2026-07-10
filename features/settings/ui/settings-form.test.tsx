import type { Cohort } from "@entities/cohort";
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
  updateProfile: vi.fn(),
  routerRefresh: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("../api/actions.ts", () => ({
  updateProfile: mocks.updateProfile,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.routerRefresh }),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess },
}));

import { SettingsForm } from "./settings-form";

const COHORT_1_ID = "a1b2c3d4-5678-4abc-9def-0123456789ab";
const COHORT_2_ID = "b1b2c3d4-5678-4abc-9def-0123456789ab";
const cohorts: Cohort[] = [
  {
    id: COHORT_1_ID,
    name: "LGE-1",
    label: "LG전자 1기",
    created_at: "2026-04-14T00:00:00Z",
    updated_at: "2026-04-14T00:00:00Z",
  },
  {
    id: COHORT_2_ID,
    name: "LGE-2",
    label: "LG전자 2기",
    created_at: "2026-04-14T00:00:00Z",
    updated_at: "2026-04-14T00:00:00Z",
  },
];

function renderForm(
  props?: Partial<{
    cohorts: Cohort[];
    email: string;
    initialCohortId: string | null;
    initialDisplayName: string;
  }>
) {
  return render(
    <SettingsForm
      cohorts={props?.cohorts ?? cohorts}
      email={props?.email ?? "alice@example.com"}
      initialCohortId={props?.initialCohortId}
      initialDisplayName={props?.initialDisplayName ?? "Alice"}
    />
  );
}

describe("<SettingsForm />", () => {
  beforeEach(() => {
    mocks.updateProfile.mockReset();
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

  it("shows the current cohort label in the cohort select", () => {
    renderForm({ initialCohortId: COHORT_2_ID });

    const trigger = screen.getByTestId("settings-cohort-trigger");
    expect(trigger).toBeEnabled();
    expect(trigger.textContent).toContain("LG전자 2기");
  });

  it("shows the placeholder when the viewer's cohort is not in the list (hidden cohort)", () => {
    renderForm({ initialCohortId: "c1b2c3d4-5678-4abc-9def-0123456789ab" });

    const trigger = screen.getByTestId("settings-cohort-trigger");
    expect(trigger.textContent).toContain("클래스를 선택하세요");
  });

  it("shows the placeholder when the viewer has no cohort", () => {
    renderForm({ initialCohortId: null });

    const trigger = screen.getByTestId("settings-cohort-trigger");
    expect(trigger.textContent).toContain("클래스를 선택하세요");
  });

  it("omits the cohort field when the cohort list is empty", () => {
    renderForm({ cohorts: [] });

    expect(
      screen.queryByTestId("settings-cohort-trigger")
    ).not.toBeInTheDocument();
  });

  it("lists only the given cohorts as options when opened", async () => {
    const user = userEvent.setup();
    renderForm({ initialCohortId: COHORT_1_ID });

    await user.click(screen.getByTestId("settings-cohort-trigger"));

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "LG전자 1기",
      "LG전자 2기",
    ]);
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

  it("saves the typed name and current cohort together and shows a success toast", async () => {
    mocks.updateProfile.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderForm({ initialCohortId: COHORT_1_ID });

    const input = screen.getByLabelText("닉네임");
    await user.clear(input);
    await user.type(input, "Bob_123");
    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        cohortId: COHORT_1_ID,
        displayName: "Bob_123",
      });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("프로필을 저장했어요.");
    expect(mocks.routerRefresh).toHaveBeenCalledTimes(1);
    expect((input as HTMLInputElement).value).toBe("Bob_123");
  });

  it("saves a newly picked cohort", async () => {
    mocks.updateProfile.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderForm({ initialCohortId: COHORT_1_ID });

    await user.click(screen.getByTestId("settings-cohort-trigger"));
    await user.click(await screen.findByRole("option", { name: "LG전자 2기" }));
    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        cohortId: COHORT_2_ID,
        displayName: "Alice",
      });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("프로필을 저장했어요.");
  });

  it("omits cohortId when the viewer has no cohort and picked none", async () => {
    mocks.updateProfile.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderForm({ initialCohortId: null });

    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        cohortId: undefined,
        displayName: "Alice",
      });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("프로필을 저장했어요.");
  });

  it("trims surrounding whitespace before passing the value to the action", async () => {
    mocks.updateProfile.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderForm({ initialCohortId: null });

    const input = screen.getByLabelText("닉네임");
    await user.clear(input);
    await user.type(input, "  Alice  ");
    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        cohortId: undefined,
        displayName: "Alice",
      });
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
    expect(mocks.updateProfile).not.toHaveBeenCalled();
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
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it("blocks client-side and shows the policy message when the value exceeds 12 chars", async () => {
    const user = userEvent.setup();
    renderForm({ initialDisplayName: "A".repeat(13) });

    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(screen.getByText(DISPLAY_NAME_POLICY_MESSAGE)).toBeInTheDocument();
    });
    expect(mocks.updateProfile).not.toHaveBeenCalled();
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
    expect(mocks.updateProfile).not.toHaveBeenCalled();
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
    mocks.updateProfile.mockResolvedValue({
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

  it("surfaces a cohort-field server error under the cohort select", async () => {
    mocks.updateProfile.mockResolvedValue({
      ok: false,
      error: { field: "cohortId", message: "클래스를 선택해 주세요." },
    });
    const user = userEvent.setup();
    renderForm({ initialCohortId: COHORT_1_ID });

    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(screen.getByTestId("settings-cohort-error")).toHaveTextContent(
        "클래스를 선택해 주세요."
      );
    });
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it("self-save: succeeds when the server accepts the user's own current nickname (any case)", async () => {
    mocks.updateProfile.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderForm({ initialDisplayName: "Alice" });

    const input = screen.getByLabelText("닉네임");
    await user.clear(input);
    await user.type(input, "alice");
    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        cohortId: undefined,
        displayName: "alice",
      });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("프로필을 저장했어요.");
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
    mocks.updateProfile.mockImplementation(
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
