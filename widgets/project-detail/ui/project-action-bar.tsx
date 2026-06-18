import { VoteButton } from "@features/toggle-vote";
import { RiExternalLinkLine } from "@remixicon/react";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/ui/button";
import type { ProjectDetail } from "../api/fetch-project-detail";

export interface ProjectActionBarProps {
  /** Extra classes for the bar root. */
  className?: string;
  isAuthenticated: boolean;
  project: ProjectDetail;
  viewerUserId: string | null;
}

/**
 * Mobile-only fixed bottom bar holding the primary actions — upvote and
 * the visit CTA — so they stay reachable while the single-column body
 * scrolls. Hidden from `md` up, where {@link ProjectSummary} shows the
 * same actions inline. Takes the full `project` (same as the summary) so
 * the two upvote instances can never drift apart.
 */
export function ProjectActionBar({
  className,
  isAuthenticated,
  project,
  viewerUserId,
}: ProjectActionBarProps) {
  const ownedByViewer =
    viewerUserId != null && project.user_id === viewerUserId;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden",
        className
      )}
      data-testid="project-detail-action-bar"
    >
      <VoteButton
        alreadyVoted={project.viewer_has_voted}
        isAuthenticated={isAuthenticated}
        ownedByViewer={ownedByViewer}
        projectId={project.id}
        testIdSuffix="mobile"
        variant="stacked"
        voteCount={project.vote_count}
      />
      <Button asChild className="flex-1 gap-2">
        <a
          href={project.project_url}
          rel="noopener noreferrer ugc"
          target="_blank"
        >
          <RiExternalLinkLine aria-hidden="true" />
          프로젝트 방문하기
        </a>
      </Button>
    </div>
  );
}
