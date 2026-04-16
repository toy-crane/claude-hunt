import { RiChat3Line } from "@remixicon/react";
import { Button } from "@shared/ui/button";
import { GitHubIcon } from "@shared/ui/icons/github";
import { Separator } from "@shared/ui/separator";
import Link from "next/link";

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
        <nav className="flex flex-wrap items-center gap-1">
          <Button asChild size="sm" variant="ghost">
            <Link href="/terms">이용약관</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/privacy">개인정보 처리방침</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <a href={REPO_URL} rel="noopener noreferrer" target="_blank">
              <GitHubIcon data-icon="inline-start" />
              <span>GitHub</span>
            </a>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <a href={ISSUE_URL} rel="noopener noreferrer" target="_blank">
              <RiChat3Line data-icon="inline-start" />
              <span>Feedback</span>
            </a>
          </Button>
          <span className="px-2.5 text-xs">
            Built by{" "}
            <a
              className="underline-offset-4 hover:underline"
              href={CREATOR_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              toycrane
            </a>
          </span>
        </nav>
      </div>
    </footer>
  );
}
