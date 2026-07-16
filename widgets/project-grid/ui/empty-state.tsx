import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@shared/ui/empty";

export interface EmptyStateProps {
  /**
   * True when the board has projects but the active class filter matched
   * none of them. Only the next step changes: inviting a first submission is
   * right for an empty board, but wrong when the projects are one filter
   * change away — there, the way out is picking another class.
   */
  filtered?: boolean;
}

export function EmptyState({ filtered = false }: EmptyStateProps) {
  return (
    <Empty className="border" data-testid="project-grid-empty">
      <EmptyHeader>
        <EmptyTitle>아직 프로젝트가 없어요</EmptyTitle>
        <EmptyDescription>
          {filtered
            ? "다른 클래스를 골라보세요."
            : "첫 프로젝트를 제출해 보세요."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
