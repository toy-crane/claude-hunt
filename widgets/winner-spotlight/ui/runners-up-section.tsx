import type { MonthlyTopProject } from "../api/fetch-monthly-top-projects";
import { RunnerUpCard } from "./runner-up-card";

export interface RunnersUpSectionProps {
  /** Rows 2..4 (already sliced by caller). */
  runnersUp: MonthlyTopProject[];
}

export function RunnersUpSection({ runnersUp }: RunnersUpSectionProps) {
  if (runnersUp.length === 0) {
    return null;
  }

  const lastRank = 1 + runnersUp.length;

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

      {/*
        One render of each card. Mobile: horizontal snap scroll
        (`w-60` items). Desktop (md+): the same flex container becomes a
        3-col grid so the cards stretch full width without scrolling.
      */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-x-visible md:px-0 md:pb-0">
        {runnersUp.map((project, i) => (
          <div
            className="w-60 flex-shrink-0 snap-start md:w-auto"
            key={project.id}
          >
            <RunnerUpCard project={project} rank={i + 2} />
          </div>
        ))}
      </div>
    </section>
  );
}
