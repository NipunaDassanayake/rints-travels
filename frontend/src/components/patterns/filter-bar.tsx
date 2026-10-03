import { cn } from "@/lib/utils";

/**
 * Presentational container for list filters (search, selects,
 * actions). Layout only: wiring filters to data belongs to the
 * page (pagination/search land with CR-017/CR-031).
 */
export function FilterBar({
  children,
  actions,
  label = "Filters",
  className,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <section
      data-slot="filter-bar"
      aria-label={label}
      className={cn(
        "flex flex-col gap-3 rounded-card border bg-card p-3 shadow-xs sm:flex-row sm:flex-wrap sm:items-end sm:p-4",
        className,
      )}
    >
      <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>

      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </section>
  );
}
