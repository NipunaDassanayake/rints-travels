import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

import { cn } from "@/lib/utils";

/**
 * Loading placeholder for a region. "spinner" for short waits /
 * small regions, "skeleton" to preview the shape of a list.
 * Always announced politely via role="status".
 */
export function LoadingState({
  label = "Loading",
  variant = "spinner",
  rows = 3,
  className,
}: {
  label?: string;
  variant?: "spinner" | "skeleton";
  rows?: number;
  className?: string;
}) {
  if (variant === "skeleton") {
    return (
      <div
        data-slot="loading-state"
        role="status"
        aria-live="polite"
        className={cn("space-y-3", className)}
      >
        <span className="sr-only">{label}</span>

        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="space-y-3 rounded-card border bg-card p-5"
          >
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      data-slot="loading-state"
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-3 text-body-sm text-muted-foreground",
        className,
      )}
    >
      <Spinner size="lg" />
      <span>{label}</span>
    </div>
  );
}
