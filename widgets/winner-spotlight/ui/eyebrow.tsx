import { currentMonthLabel, currentMonthSlug } from "../lib/format";

export function Eyebrow() {
  const monthSlug = currentMonthSlug();
  const monthLabel = currentMonthLabel();

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="inline-flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
        <span className="text-[var(--accent-terracotta)]">&gt;</span>
        <span>claude-hunt show --top --month={monthSlug}</span>
      </div>
      <h1 className="m-0 font-heading font-medium text-3xl tracking-tight">
        이달의 클로드 헌트
      </h1>
      <p className="m-0 text-muted-foreground text-sm">
        {monthLabel}, 가장 많은 응원을 받은 한 프로젝트
      </p>
    </div>
  );
}
