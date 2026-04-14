"use client";

import { RiThumbUpFill, RiThumbUpLine } from "@remixicon/react";
import { cn } from "@shared/lib/utils.ts";
import { Button } from "@shared/ui/button.tsx";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toggleVote } from "../api/actions.ts";

export interface VoteButtonProps {
  /** True when a signed-in viewer has already voted. */
  alreadyVoted: boolean;
  /** True when the viewer is authenticated. False → "Sign in" prompt. */
  isAuthenticated: boolean;
  /** True when the viewer is the owner — upvote hidden entirely. */
  ownedByViewer: boolean;
  projectId: string;
  voteCount: number;
}

export function VoteButton({
  projectId,
  voteCount,
  ownedByViewer,
  alreadyVoted,
  isAuthenticated,
}: VoteButtonProps) {
  const [optimisticVoted, setOptimisticVoted] = useState(alreadyVoted);
  const [optimisticCount, setOptimisticCount] = useState(voteCount);
  const [isPending, startTransition] = useTransition();

  if (ownedByViewer) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Button
        asChild
        className="gap-1.5"
        data-testid="vote-button-signin"
        size="sm"
        variant="outline"
      >
        <Link href="/login">
          <RiThumbUpLine aria-hidden="true" className="size-3.5" />
          Sign in to vote
        </Link>
      </Button>
    );
  }

  function handleClick() {
    const nextVoted = !optimisticVoted;
    setOptimisticVoted(nextVoted);
    setOptimisticCount((prev) => prev + (nextVoted ? 1 : -1));
    startTransition(async () => {
      const result = await toggleVote(projectId);
      if (!result.ok) {
        // Roll back on failure
        setOptimisticVoted((prev) => !prev);
        setOptimisticCount((prev) => prev + (nextVoted ? -1 : 1));
      }
    });
  }

  return (
    <Button
      aria-pressed={optimisticVoted}
      className={cn(
        "gap-1.5",
        optimisticVoted && "border-primary text-primary"
      )}
      data-testid={optimisticVoted ? "vote-button-voted" : "vote-button-idle"}
      disabled={isPending}
      onClick={handleClick}
      size="sm"
      type="button"
      variant="outline"
    >
      {optimisticVoted ? (
        <RiThumbUpFill aria-hidden="true" className="size-3.5" />
      ) : (
        <RiThumbUpLine aria-hidden="true" className="size-3.5" />
      )}
      {optimisticCount}
    </Button>
  );
}
