"use client";

import Link from "next/link";

import { useParams } from "next/navigation";

import { useEffect, useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ArrowLeft, CalendarDays, Check, Clock3, Users, X } from "lucide-react";

import { ConfirmDialog } from "@/components/patterns/confirm-dialog";

import { DescriptionList } from "@/components/patterns/description-list";

import { ErrorState } from "@/components/patterns/error-state";

import { LoadingState } from "@/components/patterns/loading-state";

import { PageHeader } from "@/components/patterns/page-header";

import { StatusBadge } from "@/components/patterns/status-badge";

import { Badge } from "@/components/ui/badge";

import { buttonVariants } from "@/components/ui/button";

import { getQuotationPaymentState } from "@/features/journeys/journey";

import { getMyPayments } from "@/features/payments/payment.api";

import { ProposedGuideCard } from "@/features/quotations/components/proposed-guide-card";

import { QuotationActionPanel } from "@/features/quotations/components/quotation-action-panel";

import { QuotationRevisions, getRevisionContext } from "@/features/quotations/components/quotation-revisions";

import {
  acceptQuotation,
  getQuotationById,
  getTourRequestQuotations,
} from "@/features/quotations/quotation.api";

import { formatMoment, isExpiredForAction } from "@/features/quotations/quotation-validity";

import { formatDate, formatMoney } from "@/lib/format";

const SECTION = "rounded-card border bg-card p-5 sm:p-6";

/** Re-render when a SENT quotation reaches its expiry while the page is open. */
const EXPIRY_WATCH_MS = 24 * 60 * 60 * 1000;

export default function TouristQuotationPage() {
  const params = useParams<{ id: string }>();

  const quotationId = params.id;

  const queryClient = useQueryClient();

  const [confirmAcceptOpen, setConfirmAcceptOpen] = useState(false);

  // The moment used for the client-side expiry check (mirrors the API).
  const [now, setNow] = useState(() => Date.now());

  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const [focusAction, setFocusAction] = useState(false);

  const actionHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const quotationQuery = useQuery({
    queryKey: ["quotation", quotationId],
    queryFn: () => getQuotationById(quotationId),
    enabled: Boolean(quotationId),
  });

  const quotation = quotationQuery.data;

  const revisionsQuery = useQuery({
    queryKey: ["tour-request", quotation?.tourRequestId, "quotations"],
    queryFn: () => getTourRequestQuotations(quotation!.tourRequestId),
    enabled: Boolean(quotation?.tourRequestId),
  });

  /**
   * ACCEPTED does not tell paid from unpaid, so the traveler's
   * payments decide whether payment is still offered.
   */
  const payments = useQuery({
    queryKey: ["payments", "me"],
    queryFn: getMyPayments,
    enabled: quotation?.status === "ACCEPTED",
  });

  const refreshRelated = async (tourRequestId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tour-request", tourRequestId, "quotations"] }),
      queryClient.invalidateQueries({ queryKey: ["tour-request", tourRequestId] }),
      queryClient.invalidateQueries({ queryKey: ["tour-requests", "me"] }),
      queryClient.invalidateQueries({ queryKey: ["quotations", "me"] }),
    ]);
  };

  const acceptMutation = useMutation({
    mutationFn: () => acceptQuotation(quotationId),

    onSuccess: async (updatedQuotation) => {
      await queryClient.invalidateQueries({ queryKey: ["quotation", quotationId] });

      await refreshRelated(updatedQuotation.tourRequestId);
    },
  });

  // Watch the expiry of a SENT quotation that is open on screen.
  useEffect(() => {
    if (!quotation?.validUntil || quotation.status !== "SENT") {
      return;
    }

    const remaining = new Date(quotation.validUntil).getTime() - Date.now();

    if (remaining <= 0 || remaining > EXPIRY_WATCH_MS) {
      return;
    }

    const timer = window.setTimeout(() => setNow(Date.now()), remaining + 50);

    return () => window.clearTimeout(timer);
  }, [quotation?.validUntil, quotation?.status]);

  // After an accept attempt changed the page, move focus to the new
  // state's heading once the confirmation dialog has fully closed.
  useEffect(() => {
    if (!focusAction || confirmAcceptOpen) {
      return;
    }

    let attempts = 0;

    const timer = window.setInterval(() => {
      attempts += 1;

      if (!document.querySelector('[role="alertdialog"]') || attempts > 40) {
        window.clearInterval(timer);

        actionHeadingRef.current?.focus();

        setFocusAction(false);
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [focusAction, confirmAcceptOpen]);

  if (quotationQuery.isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <LoadingState label="Loading your quotation" className="min-h-[50vh]" />
      </main>
    );
  }

  if (quotationQuery.isError || !quotation) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <ErrorState
          headingLevel="h1"
          title="Unable to load quotation"
          description="The quotation could not be loaded or you may not have permission to view it."
          onRetry={() => void quotationQuery.refetch()}
        />

        <div className="mt-4 text-center">
          <Link href="/tourist/quotations" className={buttonVariants({ variant: "ghost" })}>
            Back to quotations
          </Link>
        </div>
      </main>
    );
  }

  const expired = isExpiredForAction(quotation, now);

  const paymentInfo =
    quotation.status === "ACCEPTED" && payments.data
      ? getQuotationPaymentState(quotation, payments.data)
      : null;

  const revisions = getRevisionContext(quotation, revisionsQuery.data);

  const hasRevisionContext = Boolean(revisionsQuery.data && revisionsQuery.data.length > 1);

  const latestRevision = hasRevisionContext && !revisions.isLatest ? revisions.latest : null;

  const meta = [
    quotation.quotationNumber,
    `Revision ${quotation.revisionNumber}`,
    hasRevisionContext ? (revisions.isLatest ? "Latest" : "Previous revision") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const discount = Number(quotation.discountAmount);

  const tax = Number(quotation.taxAmount);

  const validity =
    quotation.status === "SENT" || quotation.status === "EXPIRED"
      ? {
          term: expired || quotation.status === "EXPIRED" ? "Expired" : "Expires",
          value: formatMoment(quotation.validUntil, "No expiry set"),
        }
      : quotation.status === "ACCEPTED"
        ? { term: "Accepted", value: formatMoment(quotation.respondedAt) }
        : { term: "Sent", value: formatMoment(quotation.sentAt) };

  const onAccept = () => {
    const current = Date.now();

    // Re-check right before asking: never offer an accept the API would refuse.
    if (isExpiredForAction(quotation, current)) {
      setNow(current);

      return;
    }

    acceptMutation.reset();

    setActionNotice(null);

    setConfirmAcceptOpen(true);
  };

  const confirmAccept = async () => {
    try {
      await acceptMutation.mutateAsync();

      setFocusAction(true);
    } catch (error) {
      // The API is authoritative: re-read the quotation. If it is no
      // longer acceptable (e.g. it expired meanwhile), show that state
      // instead of an endless "try again".
      const fresh = await quotationQuery.refetch();

      await refreshRelated(quotation.tourRequestId);

      const latest = fresh.data;

      const checkedAt = Date.now();

      if (latest && !(latest.status === "SENT" && !isExpiredForAction(latest, checkedAt))) {
        setNow(checkedAt);

        setActionNotice(
          latest.status === "EXPIRED" || isExpiredForAction(latest, checkedAt)
            ? "This quotation expired before it could be accepted."
            : "This quotation changed while you were reviewing it. Its current state is shown below.",
        );

        setFocusAction(true);

        return;
      }

      throw error;
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href={`/tourist/requests/${quotation.tourRequestId}`}
        className="inline-flex min-h-10 items-center gap-2 text-body-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to request
      </Link>

      <PageHeader
        editorial
        className="mt-2"
        overline="Quotation"
        title={quotation.title}
        description={<span data-testid="quotation-meta">{meta}</span>}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge entity="quotation" status={quotation.status} />

            {expired && (
              <Badge variant="warning">
                <Clock3 data-icon="inline-start" aria-hidden="true" />
                Expired
              </Badge>
            )}
          </div>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        {/* Price and decision: first on phones, a sticky rail on desktop. */}
        <aside aria-label="Price and next step" className="lg:order-2">
          <div className="space-y-4 lg:sticky lg:top-6">
            <section aria-labelledby="price-summary" data-testid="price-summary" className={SECTION}>
              <h2 id="price-summary" className="text-heading-md text-foreground">
                Price summary
              </h2>

              <dl className="mt-4 space-y-2 text-body-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="text-foreground">{formatMoney(quotation.subtotal, quotation.currency)}</dd>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Discount</dt>
                    <dd className="text-foreground">
                      <span aria-hidden="true">−</span>
                      <span className="sr-only">minus </span>
                      {formatMoney(quotation.discountAmount, quotation.currency)}
                    </dd>
                  </div>
                )}

                {tax > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Tax</dt>
                    <dd className="text-foreground">{formatMoney(quotation.taxAmount, quotation.currency)}</dd>
                  </div>
                )}

                <div className="flex items-end justify-between gap-4 border-t pt-3">
                  <dt className="font-medium text-foreground">Total</dt>
                  <dd className="text-heading-lg text-foreground">
                    {formatMoney(quotation.totalAmount, quotation.currency)}
                  </dd>
                </div>

                <div className="flex justify-between gap-4 pt-1">
                  <dt className="text-muted-foreground">{validity.term}</dt>
                  <dd className="text-right text-foreground">{validity.value}</dd>
                </div>
              </dl>
            </section>

            <div className={SECTION}>
              <QuotationActionPanel
                quotation={quotation}
                expired={expired}
                headingRef={actionHeadingRef}
                notice={actionNotice}
                acceptPending={acceptMutation.isPending}
                acceptError={acceptMutation.isError && quotation.status === "SENT" && !expired}
                onAccept={onAccept}
                latestRevision={latestRevision}
                payment={{
                  status: payments.isPending ? "loading" : payments.isError ? "error" : "ready",
                  state: paymentInfo?.state ?? null,
                  record: paymentInfo?.payment ?? null,
                  retry: () => void payments.refetch(),
                }}
              />
            </div>
          </div>
        </aside>

        <div className="space-y-6 lg:order-1">
          <section aria-labelledby="journey-summary" className={SECTION}>
            <h2 id="journey-summary" className="text-heading-md text-foreground">
              Journey summary
            </h2>

            {quotation.description && (
              <p className="mt-2 text-body text-foreground-secondary">{quotation.description}</p>
            )}

            <DescriptionList
              className="mt-4"
              items={[
                {
                  term: "Travel dates",
                  icon: CalendarDays,
                  value: `${formatDate(quotation.startDate)} – ${formatDate(quotation.endDate)}`,
                },
                {
                  term: "Travelers",
                  icon: Users,
                  value: `${quotation.adultCount} adult${quotation.adultCount !== 1 ? "s" : ""} · ${quotation.childCount} child${quotation.childCount !== 1 ? "ren" : ""}`,
                },
              ]}
            />
          </section>

          {quotation.itineraries.length > 0 && (
            <section aria-labelledby="itinerary" className={SECTION}>
              <h2 id="itinerary" className="text-heading-md text-foreground">
                Itinerary
              </h2>

              <ol className="mt-4 space-y-5">
                {[...quotation.itineraries]
                  .sort((a, b) => a.dayNumber - b.dayNumber)
                  .map((item) => (
                    <li key={`${item.dayNumber}-${item.title}`} className="border-l-2 border-tea-200 pl-4">
                      <p className="text-overline text-tea-700">Day {item.dayNumber}</p>

                      <h3 className="mt-1 text-heading-sm text-foreground">{item.title}</h3>

                      <p className="mt-1 text-body-sm text-foreground-secondary">{item.description}</p>
                    </li>
                  ))}
              </ol>
            </section>
          )}

          {quotation.inclusions.length > 0 && (
            <section aria-labelledby="included" className={SECTION}>
              <h2 id="included" className="text-heading-md text-foreground">
                What&apos;s included
              </h2>

              <ul className="mt-4 space-y-2">
                {quotation.inclusions.map((item) => (
                  <li key={item.id ?? item.title} className="flex gap-3 text-body-sm text-foreground">
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-tea-700" />
                    {item.title}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {quotation.exclusions.length > 0 && (
            <section aria-labelledby="not-included" className={SECTION}>
              <h2 id="not-included" className="text-heading-md text-foreground">
                What&apos;s not included
              </h2>

              <ul className="mt-4 space-y-2">
                {quotation.exclusions.map((item) => (
                  <li key={item.id ?? item.title} className="flex gap-3 text-body-sm text-foreground">
                    <X aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    {item.title}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {quotation.guide && <ProposedGuideCard guide={quotation.guide} />}

          {(quotation.notes || quotation.termsConditions) && (
            <section aria-labelledby="notes-terms" className={SECTION}>
              <h2 id="notes-terms" className="text-heading-md text-foreground">
                Notes and terms
              </h2>

              {quotation.notes && (
                <div className="mt-4">
                  <h3 className="text-heading-sm text-foreground">Notes</h3>
                  <p className="mt-1 whitespace-pre-line text-body-sm text-foreground-secondary">{quotation.notes}</p>
                </div>
              )}

              {quotation.termsConditions && (
                <div className="mt-4">
                  <h3 className="text-heading-sm text-foreground">Terms &amp; conditions</h3>
                  <p className="mt-1 whitespace-pre-line text-body-sm text-foreground-secondary">
                    {quotation.termsConditions}
                  </p>
                </div>
              )}
            </section>
          )}

          {revisionsQuery.data && <QuotationRevisions current={quotation} revisions={revisionsQuery.data} />}
        </div>
      </div>

      <ConfirmDialog
        open={confirmAcceptOpen}
        onOpenChange={setConfirmAcceptOpen}
        title="Accept this quotation?"
        description={
          <>
            By accepting, you agree to proceed with this quotation for{" "}
            {formatMoney(quotation.totalAmount, quotation.currency)}. You can then complete payment to confirm your
            booking.
            {acceptMutation.isError && (
              <span role="alert" className="mt-3 block font-medium text-destructive">
                Unable to accept the quotation. Please try again.
              </span>
            )}
          </>
        }
        confirmLabel="Yes, accept quotation"
        cancelLabel="Keep reviewing"
        onConfirm={confirmAccept}
      />
    </main>
  );
}
