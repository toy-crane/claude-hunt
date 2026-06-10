import { RiArrowRightLine } from "@remixicon/react";
import Link from "next/link";

export interface ProjectsCtaCardProps {
  projectCount: number;
}

export function ProjectsCtaCard({ projectCount }: ProjectsCtaCardProps) {
  return (
    <Link
      className="mt-2 flex items-center justify-between rounded-md border border-dashed bg-background px-6 py-5 text-foreground no-underline"
      href="/projects"
    >
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] text-muted-foreground">
          $ cd /projects
        </span>
        <span className="font-heading font-medium text-[15px]">
          전체 {projectCount}개 프로젝트 둘러보기
        </span>
        <span className="text-muted-foreground text-xs">
          클래스별 필터 · 정렬 · 직접 추천하기
        </span>
      </div>
      <span className="inline-flex items-center gap-2 font-mono text-foreground text-xs">
        프로젝트 보드 <RiArrowRightLine aria-hidden="true" size={16} />
      </span>
    </Link>
  );
}
