import { cn } from "@shared/lib/utils";

const ACCENT = "text-[#c15f3c] dark:text-[#e88a67]";

export interface PromptLineProps {
  className?: string;
  /**
   * The exact class label shown on the `--class="…"` flag. When `null`,
   * the flag segment is omitted entirely so the line reads the default
   * `$ claude-hunt ls --sort=votes`.
   */
  cohortLabel: string | null;
}

export function PromptLine({ cohortLabel, className }: PromptLineProps) {
  const classFlag = cohortLabel === null ? "" : ` --class="${cohortLabel}"`;
  return (
    <div
      className={cn("font-mono text-muted-foreground text-xs", className)}
      data-testid="prompt-line"
    >
      <span className={ACCENT} data-testid="prompt-line-dollar">
        $
      </span>{" "}
      claude-hunt ls{classFlag} --sort=votes
    </div>
  );
}
