import type { LucideIcon } from "lucide-react";
import { CompassIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Friendly "nothing here yet" block with an optional next step.
 */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = CompassIcon,
  headingLevel: Heading = "h3",
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: LucideIcon;
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center rounded-card border border-dashed border-sand-300 bg-card px-6 py-10 text-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-tea-50 text-tea-700"
      >
        <Icon className="size-6" />
      </span>

      <Heading className="mt-4 text-heading-sm text-foreground">{title}</Heading>

      {description && (
        <p className="mt-1 max-w-reading text-body-sm text-muted-foreground">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
