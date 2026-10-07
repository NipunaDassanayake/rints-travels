import { CircleAlertIcon, RotateCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

/**
 * A region that failed to load. Announced via role="alert";
 * `onRetry` renders a "Try again" button.
 */
export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  retryLabel = "Try again",
  headingLevel: Heading = "h3",
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  headingLevel?: "h1" | "h2" | "h3" | "h4";
  className?: string;
}) {
  return (
    <div
      data-slot="error-state"
      role="alert"
      className={cn(
        "flex flex-col items-center rounded-card border border-danger-border bg-danger-soft px-6 py-10 text-center",
        className,
      )}
    >
      <CircleAlertIcon aria-hidden="true" className="size-8 text-danger-ink" />

      <Heading className="mt-3 text-heading-sm text-foreground">{title}</Heading>

      {description && (
        <p className="mt-1 max-w-reading text-body-sm text-foreground-secondary">
          {description}
        </p>
      )}

      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <RotateCcwIcon />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
