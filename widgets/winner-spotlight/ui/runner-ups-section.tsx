import type { ProjectGridRow } from "@widgets/project-grid/server";

import { RunnerUpCard } from "./runner-up-card";

export interface RunnerUpsSectionProps {
  /** Rows 2..4 (already sliced by caller). */
  runnerUps: ProjectGridRow[];
}

export function RunnerUpsSection({ runnerUps }: RunnerUpsSectionProps) {
  if (runnerUps.length === 0) {
    return null;
  }

  const lastRank = 1 + runnerUps.length;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="m-0 font-heading font-medium text-base tracking-tight">
          함께 사랑받은 프로젝트
        </h3>
        <span className="font-mono text-[11px] text-muted-foreground">
          02 — {String(lastRank).padStart(2, "0")} / 이달의 인기
        </span>
      </div>

      {/* Desktop: 3-col grid. Mobile: horizontal snap scroll. */}
      <div className="hidden grid-cols-3 gap-4 md:grid">
        {runnerUps.map((project, i) => (
          <RunnerUpCard key={project.id} project={project} rank={i + 2} />
        ))}
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:hidden">
        {runnerUps.map((project, i) => (
          <div className="w-60 flex-shrink-0 snap-start" key={project.id}>
            <RunnerUpCard project={project} rank={i + 2} />
          </div>
        ))}
        <div className="w-1 flex-shrink-0" />
      </div>
    </section>
  );
}
