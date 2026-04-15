import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@shared/ui/empty";

export function EmptyState() {
  return (
    <Empty className="border" data-testid="project-grid-empty">
      <EmptyHeader>
        <EmptyTitle>아직 프로젝트가 없어요</EmptyTitle>
        <EmptyDescription>첫 프로젝트를 제출해 보세요.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
