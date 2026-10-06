import Link from "next/link";

import { StatusBadge } from "@/components/patterns/status-badge";

import type { Quotation } from "../quotation.types";

/**
 * The traveler-visible revisions of one request, newest first, and
 * which of them is the latest (CR-030 Stage 4). Revisions come from
 * the existing request-quotations endpoint, which only ever returns
 * quotations that were sent to the traveler.
 */
export function getRevisionContext(current: Quotation, revisions: Quotation[] | undefined) {
  const all = revisions?.length ? revisions : [current];

  const sorted = [...all].sort((a, b) => b.revisionNumber - a.revisionNumber);

  const latest = sorted[0];

  return {
    sorted,
    latest,
    total: Math.max(sorted.length, current.revisionNumber),
    isLatest: latest.id === current.id,
  };
}

export function QuotationRevisions({
  current,
  revisions,
}: {
  current: Quotation;
  revisions: Quotation[];
}) {
  const { sorted, latest } = getRevisionContext(current, revisions);

  if (sorted.length < 2) {
    return null;
  }

  return (
    <section aria-labelledby="quotation-revisions" className="rounded-card border bg-card p-5 sm:p-6">
      <h2 id="quotation-revisions" className="text-heading-md text-foreground">
        Revisions
      </h2>

      <p className="mt-1 text-body-sm text-muted-foreground">
        Travora revised this quotation. Only the latest revision can be accepted.
      </p>

      <ul className="mt-4 divide-y rounded-md border" data-testid="quotation-revision-list">
        {sorted.map((revision) => {
          const isCurrent = revision.id === current.id;

          const label = `Revision ${revision.revisionNumber}${revision.id === latest.id ? " (latest)" : ""}`;

          return (
            <li key={revision.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              {isCurrent ? (
                <span className="text-body-sm font-medium text-foreground" aria-current="page">
                  {label} · viewing now
                </span>
              ) : (
                <Link
                  href={`/tourist/quotations/${revision.id}`}
                  className="inline-flex min-h-10 items-center text-body-sm font-medium text-tea-700 underline underline-offset-4"
                >
                  {label}
                  <span className="sr-only">, {revision.quotationNumber}</span>
                </Link>
              )}

              <StatusBadge entity="quotation" status={revision.status} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
