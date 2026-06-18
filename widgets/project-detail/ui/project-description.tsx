import { cn } from "@shared/lib/utils";

// Cap consecutive blank lines in the description at a single blank line.
const DESCRIPTION_BLANK_LINES = /\n{3,}/g;

export interface ProjectDescriptionProps {
  /** Extra classes for the section root (e.g. grid placement). */
  className?: string;
  /** Long-form body. Callers render this only when non-null. */
  description: string;
}

/**
 * "// 프로젝트 설명" block for the spotlight layout's left column. The
 * label is a styled mono caption, not a heading, so the page keeps a
 * single h1 (the title) above the comment section's h2.
 */
export function ProjectDescription({
  className,
  description,
}: ProjectDescriptionProps) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
        {"// 프로젝트 설명"}
      </p>
      <div
        className="whitespace-pre-line text-pretty text-base leading-relaxed"
        data-testid="project-detail-description"
      >
        {description.replace(DESCRIPTION_BLANK_LINES, "\n\n")}
      </div>
    </section>
  );
}
