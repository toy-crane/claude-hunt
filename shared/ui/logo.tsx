import { cn } from "@shared/lib/utils";
import Link from "next/link";

interface LogoProps {
  /** When true, the trailing underscore cursor animates at a ~1s cadence. */
  blink?: boolean;
  className?: string;
}

const ACCENT = "text-[#c15f3c] dark:text-[#e88a67]";

export function Logo({ blink = false, className }: LogoProps) {
  return (
    <Link
      aria-label="claude-hunt home"
      className={cn(
        "inline-flex items-baseline gap-[2px] font-mono font-semibold tracking-tight",
        className
      )}
      href="/"
    >
      <span aria-hidden="true" className={ACCENT}>
        &gt;
      </span>
      <span>claude-hunt</span>
      <span
        aria-hidden="true"
        className={ACCENT}
        style={
          blink
            ? {
                animationName: "logo-cursor-blink",
                animationDuration: "1s",
                animationIterationCount: "infinite",
                animationTimingFunction: "steps(1)",
              }
            : undefined
        }
      >
        _
      </span>
    </Link>
  );
}
