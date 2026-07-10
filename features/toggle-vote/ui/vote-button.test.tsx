import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { toggleVoteMock, toastErrorMock } = vi.hoisted(() => ({
  toggleVoteMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));
vi.mock("../api/actions", () => ({
  toggleVote: toggleVoteMock,
}));
vi.mock("sonner", () => ({
  toast: { error: toastErrorMock },
}));
// Force the count to render as a plain number (no AnimatePresence) so these
// assertions stay deterministic — jsdom has no matchMedia, so motion would
// otherwise animate and emit act() warnings. The roll itself is covered in
// rolling-count.test.tsx.
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => true,
}));

import { VoteButton } from "./vote-button";

const baseProps = {
  projectId: "p1",
  voteCount: 12,
  ownedByViewer: false,
  alreadyVoted: false,
  isAuthenticated: true,
} as const;

const WHITESPACE = /\s/g;
const VOTE_LABEL_PATTERN = /Upvote|Vote|추천|투표/i;
const SIGN_IN_TO_VOTE = /Sign in to vote/i;
const KOREAN_AUTH_LABEL = /추천|투표|로그인/;

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  toggleVoteMock.mockReset();
  toastErrorMock.mockReset();
});

describe("VoteButton (signed-in non-owner)", () => {
  it("renders no text label other than the vote count", () => {
    render(<VoteButton {...baseProps} />);
    const button = screen.getByRole("button");
    const text = button.textContent ?? "";
    expect(text.replace(WHITESPACE, "")).toBe("12");
    expect(text).not.toMatch(VOTE_LABEL_PATTERN);
  });

  it("uses '추천하기' as the aria-label in every state", () => {
    const { rerender } = render(<VoteButton {...baseProps} />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "추천하기"
    );

    rerender(<VoteButton {...baseProps} alreadyVoted={true} />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "추천하기"
    );

    rerender(<VoteButton {...baseProps} isAuthenticated={false} />);
    expect(screen.getByRole("link")).toHaveAttribute("aria-label", "추천하기");
  });

  it("renders the idle outlined state when not voted (aria-pressed=false, bordered on card background)", () => {
    render(<VoteButton {...baseProps} voteCount={128} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button.className).toContain("bg-background");
    expect(button.className).toContain("text-foreground");
    expect(button.textContent).toContain("128");
  });

  it("renders the voted solid state when already voted (aria-pressed=true, filled with primary)", () => {
    render(<VoteButton {...baseProps} alreadyVoted={true} voteCount={128} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("text-primary-foreground");
  });

  it("uses an up-pointing arrow icon (svg)", () => {
    render(<VoteButton {...baseProps} />);
    const button = screen.getByRole("button");
    const svg = button.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("gives instant press feedback and never dims while the request is in flight", () => {
    render(<VoteButton {...baseProps} />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("active:scale-[0.97]");
    expect(button.className).not.toContain("opacity-60");
  });

  it("shows the optimistic count and pressed state while the server call is in flight", async () => {
    const deferred = createDeferred<{ ok: true; voted: true }>();
    toggleVoteMock.mockReturnValue(deferred.promise);
    const user = userEvent.setup();
    render(<VoteButton {...baseProps} voteCount={12} />);

    const button = screen.getByRole("button");
    expect(button.textContent).toContain("12");
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);

    expect(button.textContent).toContain("13");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toBeDisabled();

    deferred.resolve({ ok: true, voted: true });
  });

  it("reflects the new server state when parent re-renders with fresh props after success", async () => {
    toggleVoteMock.mockResolvedValue({ ok: true, voted: true });
    const user = userEvent.setup();
    const { rerender } = render(<VoteButton {...baseProps} voteCount={128} />);

    await user.click(screen.getByRole("button"));

    // Production: server resolves → revalidatePath → parent re-renders with
    // fresh props. Without the prop update, useOptimistic reconciles back to
    // base value, which is the expected useOptimistic contract.
    rerender(<VoteButton {...baseProps} alreadyVoted={true} voteCount={129} />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button.textContent).toContain("129");
    expect(button).not.toBeDisabled();
  });

  it("reverts to the idle state when the server rejects the vote and shows a toast", async () => {
    toggleVoteMock.mockResolvedValue({ ok: false, error: "denied" });
    const user = userEvent.setup();
    render(<VoteButton {...baseProps} voteCount={128} />);

    const button = screen.getByRole("button");
    await user.click(button);

    // Server failed → no prop update → useOptimistic auto-reverts to base.
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button.textContent).toContain("128");
    expect(button).not.toBeDisabled();
    expect(toastErrorMock).toHaveBeenCalledWith("denied");
  });

  it("syncs to fresh props when an external change updates voteCount/alreadyVoted", () => {
    const { rerender } = render(
      <VoteButton {...baseProps} alreadyVoted={false} voteCount={5} />
    );
    const button = screen.getByRole("button");
    expect(button.textContent).toContain("5");
    expect(button).toHaveAttribute("aria-pressed", "false");

    // Someone else votes for this project — parent revalidates with new count.
    rerender(<VoteButton {...baseProps} alreadyVoted={false} voteCount={6} />);
    expect(button.textContent).toContain("6");

    // The viewer's own vote is reflected in props on the next revalidation.
    rerender(<VoteButton {...baseProps} alreadyVoted={true} voteCount={7} />);
    expect(button.textContent).toContain("7");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
});

describe("VoteButton (unauthenticated)", () => {
  it("renders a link to /login without 'Sign in to vote' text when unauthenticated", () => {
    render(<VoteButton {...baseProps} isAuthenticated={false} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/login");
    expect(link.textContent ?? "").not.toMatch(SIGN_IN_TO_VOTE);
    expect(link.textContent ?? "").not.toMatch(KOREAN_AUTH_LABEL);
  });

  it("renders the count and uses the outline button variant", () => {
    render(
      <VoteButton {...baseProps} isAuthenticated={false} voteCount={42} />
    );
    const link = screen.getByRole("link");
    expect(link.textContent).toContain("42");
  });

  it("does not carry a disabled attribute", () => {
    render(<VoteButton {...baseProps} isAuthenticated={false} />);
    const link = screen.getByRole("link");
    expect(link).not.toHaveAttribute("disabled");
    expect(link).not.toHaveAttribute("aria-disabled", "true");
  });

  it("does not change the visible count when clicked (no optimistic path)", async () => {
    const user = userEvent.setup();
    render(
      <VoteButton {...baseProps} isAuthenticated={false} voteCount={42} />
    );
    const link = screen.getByRole("link");
    expect(link.textContent).toContain("42");

    await user.click(link);

    expect(screen.getByRole("link").textContent).toContain("42");
    expect(toggleVoteMock).not.toHaveBeenCalled();
  });
});

describe("VoteButton (variant='inline')", () => {
  it("renders a horizontal, square-cornered button with tabular count", () => {
    render(<VoteButton {...baseProps} variant="inline" voteCount={42} />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("flex-row");
    expect(button.className).toContain("rounded-none");
    expect(button.className).toContain("font-mono");
    expect(button.textContent).toContain("42");
  });

  it("flips to the filled primary fill when voted", () => {
    render(<VoteButton {...baseProps} alreadyVoted={true} variant="inline" />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("text-primary-foreground");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("auto-reverts to the base state in the inline variant when the server rejects", async () => {
    toggleVoteMock.mockResolvedValue({ ok: false });
    const user = userEvent.setup();
    render(<VoteButton {...baseProps} variant="inline" voteCount={12} />);
    const button = screen.getByRole("button");

    await user.click(button);

    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button.textContent).toContain("12");
  });

  it("renders the owner indicator as a compact inline row (no button)", () => {
    render(
      <VoteButton
        {...baseProps}
        ownedByViewer={true}
        variant="inline"
        voteCount={9}
      />
    );
    const indicator = screen
      .getByText("9")
      .closest("[data-testid='vote-owner-count']");
    expect(indicator).not.toBeNull();
    expect(indicator?.className).toContain("flex-row");
    expect(indicator?.className).toContain("rounded-none");
  });
});

describe("VoteButton (owner)", () => {
  it("renders no control with the vote accessible name when owned by the viewer", () => {
    render(<VoteButton {...baseProps} ownedByViewer={true} voteCount={7} />);
    expect(screen.queryByRole("button", { name: "추천하기" })).toBeNull();
    expect(screen.queryByRole("link", { name: "추천하기" })).toBeNull();
  });

  it("shows the count exactly once in a muted read-only indicator", () => {
    render(<VoteButton {...baseProps} ownedByViewer={true} voteCount={7} />);
    const matches = screen.getAllByText("7");
    expect(matches).toHaveLength(1);
    const indicator = matches[0].closest("[data-testid='vote-owner-count']");
    expect(indicator).not.toBeNull();
    expect(indicator?.className).toContain("text-muted-foreground");
  });

  it("renders the owner indicator as non-interactive (no button/link, no aria-pressed)", () => {
    const { container } = render(
      <VoteButton {...baseProps} ownedByViewer={true} voteCount={7} />
    );
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("[aria-pressed]")).toBeNull();
  });
});
