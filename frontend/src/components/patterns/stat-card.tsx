import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Single metric. Numbers use tabular figures; the label is the
 * <dt> naming the value (<dd>), with an optional hint.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "flex items-start justify-between gap-3 rounded-card border bg-card p-4 shadow-xs sm:p-5",
        className,
      )}
    >
      <dl className="min-w-0">
        <dt className="text-body-sm text-muted-foreground">{label}</dt>

        <dd className="mt-1 text-stat text-foreground">{value}</dd>

        {hint && (
          <dd className="mt-1 text-caption text-muted-foreground">{hint}</dd>
        )}
      </dl>

      {Icon && (
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-tea-50 text-tea-700"
        >
          <Icon className="size-5" />
        </span>
      )}
    </div>
  );
}
