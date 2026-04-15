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

beforeEach(() => {
  toggleVoteMock.mockReset();
});

describe("VoteButton", () => {
  it("hides the button when the project is owned by the viewer", () => {
    const { container } = render(
      <VoteButton {...baseProps} ownedByViewer={true} />
    );
    expect(container.firstChild).toBeNull();
  });

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

  it("applies the active color classes when already voted", () => {
    render(<VoteButton {...baseProps} alreadyVoted={true} />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("border-primary");
    expect(button.className).toContain("text-primary");
  });

  it("uses an up-pointing arrow icon (svg)", () => {
    render(<VoteButton {...baseProps} />);
    const button = screen.getByRole("button");
    const svg = button.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("renders a link to /login without 'Sign in to vote' text when unauthenticated", () => {
    render(<VoteButton {...baseProps} isAuthenticated={false} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/login");
    expect(link.textContent ?? "").not.toMatch(SIGN_IN_TO_VOTE);
    expect(link.textContent ?? "").not.toMatch(KOREAN_AUTH_LABEL);
  });

  it("optimistically increments the count when clicked", async () => {
    toggleVoteMock.mockResolvedValue({ ok: true, voted: true });
    const user = userEvent.setup();
    render(<VoteButton {...baseProps} />);

    const button = screen.getByRole("button");
    expect(button.textContent).toContain("12");

    await user.click(button);

    expect(button.textContent).toContain("13");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
});
