import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const leaveComment = vi.fn();
vi.mock("../api/actions", () => ({
  leaveComment,
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

const routerRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { CommentForm } = await import("./comment-form");

const SUBMIT_LABEL = /등록/;

describe("<CommentForm />", () => {
  it("shows a Spinner on the submit button while pending and keeps the static label", async () => {
    leaveComment.mockImplementation(
      () => new Promise<{ ok: true }>(() => undefined)
    );
    const user = userEvent.setup();
    render(<CommentForm isAuthenticated projectId="p1" />);

    await user.type(
      screen.getByRole("textbox", { name: "댓글 내용" }),
      "Nice work!"
    );
    await user.click(screen.getByRole("button", { name: SUBMIT_LABEL }));

    await waitFor(() => {
      const button = screen.getByRole("button", { name: SUBMIT_LABEL });
      expect(button).toBeDisabled();
      expect(button.querySelector('[role="status"]')).toBeInTheDocument();
      expect(button.textContent).toContain("등록");
      expect(button.textContent).not.toContain("등록 중");
    });
  });
});
