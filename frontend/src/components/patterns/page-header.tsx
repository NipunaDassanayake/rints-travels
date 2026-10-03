import { cn } from "@/lib/utils";

/**
 * Page title block: optional overline, the page's <h1>, an
 * optional description and actions. `editorial` switches the
 * title to the Fraunces display face -- public and traveler
 * areas only (never admin/guide).
 */
export function PageHeader({
  title,
  description,
  overline,
  actions,
  editorial = false,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  overline?: React.ReactNode;
  actions?: React.ReactNode;
  editorial?: boolean;
  className?: string;
}) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-reading">
        {overline && (
          <p className="text-overline text-tea-700">{overline}</p>
        )}

        <h1
          className={cn(
            "text-foreground",
            overline && "mt-2",
            editorial
              ? "font-display text-display-md"
              : "text-heading-xl",
          )}
        >
          {title}
        </h1>

        {description && (
          <p className="mt-2 text-body text-muted-foreground">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      )}
    </header>
  );
}
