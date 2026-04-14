import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@shared/ui/empty.tsx";

export function EmptyState() {
  return (
    <Empty className="border" data-testid="project-grid-empty">
      <EmptyHeader>
        <EmptyTitle>No projects yet</EmptyTitle>
        <EmptyDescription>Be the first to submit a project.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
