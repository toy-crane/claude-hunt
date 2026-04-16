import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { toggleVoteMock } = vi.hoisted(() => ({
  toggleVoteMock: vi.fn(),
}));
vi.mock("../api/actions", () => ({
  toggleVote: toggleVoteMock,
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
const CORAL_BG = /\bbg-vote\b/;
const CORAL_TEXT = /\btext-vote\b/;
const CORAL_BORDER = /\bborder-vote\b/;

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  toggleVoteMock.mockReset();
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

  it("renders the idle coral pill when not voted (aria-pressed=false, border-vote + text-vote classes)", () => {
    render(<VoteButton {...baseProps} voteCount={128} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button.className).toContain("border-vote");
    expect(button.className).toContain("text-vote");
    expect(button.textContent).toContain("128");
  });

  it("renders the voted solid-coral pill when already voted (aria-pressed=true, bg-vote + text-vote-foreground classes)", () => {
    render(<VoteButton {...baseProps} alreadyVoted={true} voteCount={128} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button.className).toContain("bg-vote");
    expect(button.className).toContain("text-vote-foreground");
  });

  it("uses an up-pointing arrow icon (svg)", () => {
    render(<VoteButton {...baseProps} />);
    const button = screen.getByRole("button");
    const svg = button.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("optimistically increments the count and flips aria-pressed synchronously on click", async () => {
    toggleVoteMock.mockResolvedValue({ ok: true, voted: true });
    const user = userEvent.setup();
    render(<VoteButton {...baseProps} voteCount={12} />);

    const button = screen.getByRole("button");
    expect(button.textContent).toContain("12");
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);

    expect(button.textContent).toContain("13");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("disables the button and dims it while the server call is in flight", async () => {
    const deferred = createDeferred<{ ok: true; voted: true }>();
    toggleVoteMock.mockReturnValue(deferred.promise);
    const user = userEvent.setup();
    render(<VoteButton {...baseProps} voteCount={12} />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(button).toBeDisabled();
    expect(button.className).toContain("opacity-");

    deferred.resolve({ ok: true, voted: true });
  });

  it("stays in the voted state with the optimistic count after the server confirms success", async () => {
    toggleVoteMock.mockResolvedValue({ ok: true, voted: true });
    const user = userEvent.setup();
    render(<VoteButton {...baseProps} voteCount={128} />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button.textContent).toContain("129");
    expect(button).not.toBeDisabled();
  });

  it("reverts to the idle state with the original count when the server rejects the vote", async () => {
    toggleVoteMock.mockResolvedValue({ ok: false });
    const user = userEvent.setup();
    render(<VoteButton {...baseProps} voteCount={128} />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button.textContent).toContain("128");
    expect(button).not.toBeDisabled();
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

  it("renders the pill with the same visual classes as the idle signed-in pill", () => {
    render(
      <VoteButton {...baseProps} isAuthenticated={false} voteCount={42} />
    );
    const link = screen.getByRole("link");
    expect(link.className).toContain("border-vote");
    expect(link.className).toContain("text-vote");
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

  it("does not use any of the coral utility classes", () => {
    const { container } = render(
      <VoteButton {...baseProps} ownedByViewer={true} voteCount={7} />
    );
    const html = container.innerHTML;
    expect(html).not.toMatch(CORAL_BG);
    expect(html).not.toMatch(CORAL_TEXT);
    expect(html).not.toMatch(CORAL_BORDER);
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
