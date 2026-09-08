import { cn } from "@shared/lib/utils";

const ACCENT = "text-[var(--accent-terracotta)]";

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
  return (
    <div
      className={cn("font-mono text-muted-foreground text-xs", className)}
      data-testid="prompt-line"
    >
      <span className={ACCENT} data-testid="prompt-line-dollar">
        $
      </span>{" "}
      claude-hunt ls --sort=votes
      {cohortLabel === null ? null : (
        <>
          {' --class="'}
          {/* Class labels are Korean, and a monospace blank pushes Korean
              words apart. Only the flag around the label stays mono. */}
          <span className="font-sans">{cohortLabel}</span>
          {'"'}
        </>
      )}
    </div>
  );
}
