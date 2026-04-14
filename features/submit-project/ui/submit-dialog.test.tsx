import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const TRIGGER_LABEL = /submit a project/i;
const DISCARD_LABEL = /discard/i;

const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: { success: toastSuccess },
}));

// Stub SubmitForm: exposes a button that triggers onSuccess, and a
// marker so tests can assert the form was rendered with the right
// cohortId. Keeps the dialog test focused on dialog wiring (not
// form mechanics, which are covered by submit-form.test.tsx).
vi.mock("./submit-form.tsx", () => ({
  SubmitForm: ({
    cohortId,
    onSuccess,
  }: {
    cohortId: string | null;
    onSuccess?: () => void;
  }) => (
    <div data-testid="submit-form-stub">
      <span data-testid="submit-form-cohort">{cohortId ?? "(none)"}</span>
      <button
        data-testid="submit-form-stub-success"
        onClick={() => onSuccess?.()}
        type="button"
      >
        Fake submit
      </button>
    </div>
  ),
}));

const { SubmitDialog } = await import("./submit-dialog.tsx");

describe("SubmitDialog", () => {
  beforeEach(() => {
    toastSuccess.mockReset();
  });

  describe("signed-out", () => {
    it("renders a link to /login and does not open a dialog", async () => {
      const user = userEvent.setup();
      render(<SubmitDialog cohortId={null} isAuthenticated={false} />);

      const link = screen.getByRole("link", { name: TRIGGER_LABEL });
      expect(link).toHaveAttribute("href", "/login");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await user.click(link);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("signed-in with a cohort", () => {
    it("shows a trigger button that opens a dialog with the submit form", async () => {
      const user = userEvent.setup();
      render(<SubmitDialog cohortId="cohort-1" isAuthenticated />);

      const trigger = screen.getByRole("button", { name: TRIGGER_LABEL });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      await user.click(trigger);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByTestId("submit-form-stub")).toBeInTheDocument();
      expect(screen.getByTestId("submit-form-cohort")).toHaveTextContent(
        "cohort-1"
      );
    });

    it("closes the dialog and fires a toast when the form reports success", async () => {
      const user = userEvent.setup();
      render(<SubmitDialog cohortId="cohort-1" isAuthenticated />);

      await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));
      await user.click(screen.getByTestId("submit-form-stub-success"));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(toastSuccess).toHaveBeenCalledTimes(1);
      expect(toastSuccess).toHaveBeenCalledWith("Project submitted");
    });

    it("closes the dialog silently when Escape is pressed, without a confirmation prompt", async () => {
      const user = userEvent.setup();
      render(<SubmitDialog cohortId="cohort-1" isAuthenticated />);

      await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await user.keyboard("{Escape}");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        screen.queryByText(DISCARD_LABEL, {
          selector: "button,[role=button]",
        })
      ).not.toBeInTheDocument();
    });
  });

  describe("signed-in without a cohort", () => {
    it("opens the dialog with cohortId=null so the form renders its guidance state", async () => {
      const user = userEvent.setup();
      render(<SubmitDialog cohortId={null} isAuthenticated />);

      await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByTestId("submit-form-cohort")).toHaveTextContent(
        "(none)"
      );
    });
  });
});
