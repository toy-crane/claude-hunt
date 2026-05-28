export interface EyebrowProps {
  /** "2026년 5월" rendered in the subtitle. */
  monthLabel: string;
  /** "YYYY-MM" rendered inside the terminal-style prompt. */
  monthSlug: string;
}

export function Eyebrow({ monthSlug, monthLabel }: EyebrowProps) {
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
        {monthLabel}의 1위 프로젝트
      </p>
    </div>
  );
}
