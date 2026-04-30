import { RiAddLine } from "@remixicon/react";
import { Button } from "@shared/ui/button";
import Link from "next/link";

export interface SubmitTriggerProps {
  /** True when the viewer is authenticated. False → links to `/login`. */
  isAuthenticated: boolean;
}

/**
 * "프로젝트 제출" entry-point button. Lives wherever the board exposes
 * the call-to-action (currently the board page header). The actual
 * form lives at `/projects/new`; an unauthenticated viewer is sent to
 * `/login` first.
 *
 * Replaces the prior modal-based `SubmitDialog`. Page-style submission
 * is the wireframe-decided UX and is the only entry point that can
 * redirect to the new project's detail page on success.
 */
export function SubmitTrigger({ isAuthenticated }: SubmitTriggerProps) {
  return (
    <Button asChild data-testid="submit-project-trigger">
      <Link href={isAuthenticated ? "/projects/new" : "/login"}>
        <RiAddLine data-icon="inline-start" />
        <span>프로젝트 제출</span>
      </Link>
    </Button>
  );
}
