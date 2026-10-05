import Link from "next/link";

import { X } from "lucide-react";

import {
  DEFAULT_SORT,
  describeShownCount,
  getSortOption,
  packagesHref,
  type PackageSearch,
} from "../package-query";

/*
 * Result context for /packages (CR-029 Stage 3A): a status line
 * ("2 packages in “Ella” matching “Tea”"), one removable chip per
 * active search filter, and Clear all. The status element stays
 * mounted across client navigations so screen readers announce
 * each new result count. When only the first page is shown,
 * "Showing 10 of 14 packages" follows as secondary text (3C).
 */

export function describeResults(total: number, search: PackageSearch) {
  let text = `${total} ${total === 1 ? "package" : "packages"}`;

  if (search.destination) {
    text += ` in “${search.destination}”`;
  }

  if (search.q) {
    text += ` matching “${search.q}”`;
  }

  if (search.sort !== DEFAULT_SORT) {
    text += ` · sorted by ${getSortOption(search.sort).summary}`;
  }

  return text;
}

export function PackageResultsSummary({
  total,
  shown,
  search,
}: {
  total: number;
  /** Packages actually rendered (the API's first page). */
  shown: number;
  search: PackageSearch;
}) {
  const chips = [
    search.destination && {
      label: "Destination",
      value: search.destination,
      href: packagesHref({ ...search, destination: "" }),
    },
    search.q && {
      label: "Package",
      value: search.q,
      href: packagesHref({ ...search, q: "" }),
    },
  ].filter((chip): chip is { label: string; value: string; href: string } => Boolean(chip));

  const canClear = chips.length > 0 || search.sort !== DEFAULT_SORT;

  const shownCount = describeShownCount(shown, total);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <p role="status" className="text-body text-foreground">
          {describeResults(total, search)}
        </p>

        {chips.length > 0 && (
          <ul aria-label="Active filters" className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <li key={chip.label}>
                <Link
                  href={chip.href}
                  aria-label={`Remove ${chip.label}: ${chip.value}`}
                  className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-border bg-card px-3.5 text-label text-foreground transition-colors duration-fast hover:border-tea-300 hover:bg-tea-50"
                >
                  <span className="truncate">
                    <span className="text-muted-foreground">{chip.label}:</span> {chip.value}
                  </span>

                  <X aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {canClear && (
          <Link
            href="/packages"
            className="inline-flex min-h-10 items-center rounded-sm text-label text-tea-700 underline-offset-4 hover:text-tea-800 hover:underline"
          >
            Clear all
          </Link>
        )}
      </div>

      {/* Plain text, outside the status: read in place, not announced twice. */}
      {shownCount && (
        <p className="mt-2 text-body-sm text-muted-foreground">{shownCount}</p>
      )}
    </div>
  );
}
