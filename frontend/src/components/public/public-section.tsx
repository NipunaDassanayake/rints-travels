import { cn } from "@/lib/utils";

/*
 * Public marketing section (CR-029): tone, spacing, container and
 * the editorial header (overline + Fraunces h2 + lead + action).
 * The section is labelled by its heading.
 */

const TONES = {
  ivory: "bg-background text-foreground",
  sand: "bg-sand-50 text-foreground",
  ink: "bg-ink-950 text-ivory",
} as const;

export function PublicSection({
  id,
  tone = "ivory",
  overline,
  title,
  description,
  action,
  children,
  className,
}: {
  id: string;
  tone?: keyof typeof TONES;
  overline?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const dark = tone === "ink";

  const headingId = `${id}-heading`;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-surface={dark ? "dark" : undefined}
      className={cn("scroll-mt-20 py-20 sm:py-24", TONES[tone], className)}
    >
      <div className="mx-auto max-w-wide px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            {overline && (
              <p className={cn("text-overline", dark ? "text-tea-300" : "text-tea-700")}>
                {overline}
              </p>
            )}

            <h2
              id={headingId}
              className={cn(
                "mt-3 font-display text-display-md",
                dark ? "text-ivory" : "text-foreground",
              )}
            >
              {title}
            </h2>

            {description && (
              <p
                className={cn(
                  "mt-4 text-body-lg",
                  dark ? "text-ink-200" : "text-foreground-secondary",
                )}
              >
                {description}
              </p>
            )}
          </div>

          {action && <div className="shrink-0">{action}</div>}
        </div>

        {children}
      </div>
    </section>
  );
}
