import { cn } from "@/lib/utils";

/**
 * Section title block (<h2> by default) with optional
 * description and a trailing action (e.g. "View all").
 */
export function SectionHeader({
  title,
  description,
  action,
  as: Heading = "h2",
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div
      data-slot="section-header"
      className={cn("flex flex-wrap items-end justify-between gap-3", className)}
    >
      <div className="min-w-0">
        <Heading
          className={Heading === "h2" ? "text-heading-lg" : "text-heading-md"}
        >
          {title}
        </Heading>

        {description && (
          <p className="mt-1 text-body-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
