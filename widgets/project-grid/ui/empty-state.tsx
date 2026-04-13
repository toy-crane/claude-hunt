export function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-none border border-dashed py-16 text-center"
      data-testid="project-grid-empty"
    >
      <p className="font-medium text-sm">No projects yet</p>
      <p className="text-muted-foreground text-xs">
        Be the first to submit a project.
      </p>
    </div>
  );
}
