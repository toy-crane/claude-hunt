"use client";

import { cn } from "@shared/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef } from "react";

/**
 * Direction-aware odometer roll. `dir >= 0` (count went up) rolls the old
 * number up and out while the new one rises from below; a decrease reverses it.
 */
const rollVariants = {
  enter: (dir: number) => ({ opacity: 0, y: dir >= 0 ? "100%" : "-100%" }),
  center: { opacity: 1, y: "0%" },
  exit: (dir: number) => ({ opacity: 0, y: dir >= 0 ? "-100%" : "100%" }),
};

export interface RollingCountProps {
  className?: string;
  value: number;
}

/**
 * Renders a vote count that vertically rolls to the new value when it changes.
 *
 * The visible text node always holds exactly the current `value` (the outgoing
 * number is a transient, layout-popped sibling), so `textContent`/`getByText`
 * stay clean. Respects `prefers-reduced-motion` by rendering a plain number.
 */
export function RollingCount({ className, value }: RollingCountProps) {
  const prevRef = useRef(value);
  const dir = value >= prevRef.current ? 1 : -1;
  prevRef.current = value;
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <span className={cn("tabular-nums", className)}>{value}</span>;
  }

  return (
    <span
      className={cn(
        "relative inline-flex overflow-hidden tabular-nums",
        className
      )}
      style={{ lineHeight: 1 }}
    >
      <AnimatePresence custom={dir} initial={false} mode="popLayout">
        <motion.span
          animate="center"
          className="inline-block"
          custom={dir}
          exit="exit"
          initial="enter"
          key={value}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          variants={rollVariants}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
