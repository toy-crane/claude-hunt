import { RiLoaderLine } from "@remixicon/react";
import { cn } from "@shared/lib/utils";

type SpinnerProps = Omit<React.ComponentProps<"svg">, "children">;

function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <RiLoaderLine
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      role="status"
      {...props}
    />
  );
}

export { Spinner };
