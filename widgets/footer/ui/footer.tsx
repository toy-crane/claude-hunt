import { RiChat3Line, RiExternalLinkLine } from "@remixicon/react";
import { GitHubIcon } from "@shared/ui/icons/github";
import { Separator } from "@shared/ui/separator";

const REPO_URL = "https://github.com/toy-crane/claude-hunt";
const ISSUE_URL = `${REPO_URL}/issues/new`;
const CREATOR_URL = "https://toycrane.xyz";
const COPYRIGHT_YEAR = 2026;

export function Footer() {
  return (
    <footer>
      <Separator />
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-6 py-6 text-muted-foreground text-sm sm:flex-row sm:items-center">
        <span>© {COPYRIGHT_YEAR} claude-hunt</span>
        <nav className="flex items-center gap-5">
          <a
            className="inline-flex items-center gap-1.5 hover:text-foreground"
            href={REPO_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            <GitHubIcon className="size-4" />
            <span>GitHub</span>
          </a>
          <a
            className="inline-flex items-center gap-1.5 hover:text-foreground"
            href={ISSUE_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            <RiChat3Line className="size-4" />
            <span>Feedback</span>
          </a>
          <a
            className="inline-flex items-center gap-1.5 hover:text-foreground"
            href={CREATOR_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>by toycrane</span>
            <RiExternalLinkLine className="size-3" />
          </a>
        </nav>
      </div>
    </footer>
  );
}
