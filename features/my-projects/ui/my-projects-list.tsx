import { RiAddLine } from "@remixicon/react";
import { Button } from "@shared/ui/button";
import Link from "next/link";
import type { MyProjectRow as MyProjectRowData } from "../api/fetch-my-projects";
import { MyProjectRow } from "./my-project-row";

export interface MyProjectsListProps {
  projects: MyProjectRowData[];
}

export function MyProjectsList({ projects }: MyProjectsListProps) {
  if (projects.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-3 border border-border border-dashed p-8 text-center text-muted-foreground text-xs"
        data-testid="my-projects-empty"
      >
        <p>아직 등록한 프로젝트가 없어요.</p>
        <Button asChild size="sm" variant="outline">
          <Link href="/projects/new">
            <RiAddLine />새 프로젝트 등록하기
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="overflow-hidden bg-card ring-1 ring-foreground/10"
        data-testid="my-projects-table"
      >
        {/* Header — desktop only */}
        <div className="hidden grid-cols-[62px_1fr_56px_72px_72px] items-center gap-2.5 border-border border-b bg-muted px-3 py-2 font-mono text-[11px] text-muted-foreground min-[720px]:grid">
          <span />
          <span>제목</span>
          <span className="text-right">추천</span>
          <span>제출일</span>
          <span className="text-right">작업</span>
        </div>

        {projects.map((project) => (
          <MyProjectRow key={project.id} project={project} />
        ))}
      </div>

      <p className="px-1 font-mono text-[11px] text-muted-foreground">
        <span className="font-semibold text-[var(--accent-terracotta)]">
          {">"}
        </span>{" "}
        총 {projects.length}개의 프로젝트
        <span className="font-semibold text-[var(--accent-terracotta)]">_</span>
      </p>
    </div>
  );
}
