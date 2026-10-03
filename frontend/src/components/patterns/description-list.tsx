import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface DescriptionItem {
  term: React.ReactNode;
  value: React.ReactNode;
  icon?: LucideIcon;
}

/**
 * Label/value pairs (replaces the hand-rolled "Travel dates /
 * Budget / Preferred guide" grids) with valid dl semantics: each
 * group is a <div> holding exactly one <dt> and one <dd>; the
 * optional icon sits inside the <dt>.
 */
export function DescriptionList({
  items,
  columns = 2,
  className,
}: {
  items: DescriptionItem[];
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <dl
      data-slot="description-list"
      className={cn(
        "grid gap-x-6 gap-y-4",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map(({ term, value, icon: Icon }, index) => (
        <div key={index} className="min-w-0">
          <dt className="flex items-center gap-2 text-caption text-muted-foreground">
            {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
            {term}
          </dt>

          <dd
            className={cn(
              "mt-0.5 text-body-sm font-medium break-words text-foreground",
              Icon && "pl-6",
            )}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
