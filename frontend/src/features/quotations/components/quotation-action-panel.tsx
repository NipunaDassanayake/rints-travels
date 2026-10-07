import Link from "next/link";

import type { RefObject } from "react";

import { CircleCheck, CircleX, Clock3, History, Wallet } from "lucide-react";

import { ErrorState } from "@/components/patterns/error-state";

import { LoadingState } from "@/components/patterns/loading-state";

import { Button, buttonVariants } from "@/components/ui/button";

import { InitiatePaymentCard } from "@/features/payments/components/initiate-payment-card";

import type { QuotationPaymentState } from "@/features/journeys/journey";

import type { Payment } from "@/features/payments/payment.types";

import { formatMoment } from "../quotation-validity";

import type { Quotation } from "../quotation.types";

import { RejectQuotationDialog } from "./reject-quotation-dialog";

const HEADING = "text-heading-md text-foreground outline-none";

function Notice({
  icon: Icon,
  tone = "neutral",
  children,
}: {
  icon: typeof Wallet;
  tone?: "neutral" | "success";
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon
        aria-hidden="true"
        className={tone === "success" ? "mt-0.5 size-5 shrink-0 text-success-ink" : "mt-0.5 size-5 shrink-0 text-muted-foreground"}
      />

      <div className="min-w-0 text-body-sm text-foreground-secondary">{children}</div>
    </div>
  );
}

export interface QuotationActionPanelProps {
  quotation: Quotation;
  /** SENT but past validUntil (mirrors the API's own check). */
  expired: boolean;
  /** Receives focus after a state change the traveler caused (accept). */
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** Explains a state the traveler did not expect (e.g. expired while accepting). */
  notice?: string | null;
  acceptPending: boolean;
  acceptError: boolean;
  onAccept: () => void;
  payment: {
    status: "loading" | "error" | "ready";
    state: QuotationPaymentState | null;
    record: Payment | null;
    retry: () => void;
  };
  /** Latest traveler-visible revision, when it is not this one. */
  latestRevision: Quotation | null;
}

/**
 * The single, state-driven decision area of a quotation
 * (CR-030 Stage 4): what the traveler can do now, read from the
 * quotation status, its validity and the traveler's payment. It
 * never shows an action the API would refuse.
 */
export function QuotationActionPanel({
  quotation,
  expired,
  headingRef,
  notice,
  acceptPending,
  acceptError,
  onAccept,
  payment,
  latestRevision,
}: QuotationActionPanelProps) {
  const latestLink = latestRevision ? (
    <Link
      href={`/tourist/quotations/${latestRevision.id}`}
      className={`${buttonVariants()} mt-4 w-full`}
      data-testid="latest-revision-link"
    >
      View latest revision (Revision {latestRevision.revisionNumber})
    </Link>
  ) : null;

  const noticeBlock = notice ? (
    <p role="status" className="mb-4 rounded-md border border-warning-border bg-warning-soft p-3 text-body-sm text-warning-ink">
      {notice}
    </p>
  ) : null;

  /* ---------- SENT ---------- */

  if (quotation.status === "SENT" && !expired) {
    return (
      <section aria-labelledby="quotation-action" data-testid="quotation-action" className="space-y-3">
        {noticeBlock}

        <h2 id="quotation-action" ref={headingRef} tabIndex={-1} className={HEADING}>
          Your response
        </h2>

        <p className="text-body-sm text-foreground-secondary">
          Review the complete quotation before accepting or rejecting it. Payment becomes available once you accept.
        </p>

        <Button
          className="w-full"
          size="lg"
          aria-haspopup="dialog"
          disabled={acceptPending}
          onClick={onAccept}
        >
          <CircleCheck aria-hidden="true" className="size-4" />
          {acceptPending ? "Accepting..." : "Accept quotation"}
        </Button>

        <RejectQuotationDialog quotationId={quotation.id} tourRequestId={quotation.tourRequestId} />

        {acceptError && (
          <p role="alert" className="text-body-sm text-danger-ink">
            Unable to accept the quotation. Please try again.
          </p>
        )}
      </section>
    );
  }

  /* ---------- EXPIRED (by validity or by status) ---------- */

  if (expired || quotation.status === "EXPIRED") {
    return (
      <section aria-labelledby="quotation-action" data-testid="quotation-action">
        {noticeBlock}

        <h2 id="quotation-action" ref={headingRef} tabIndex={-1} className={HEADING}>
          This quotation has expired
        </h2>

        <div className="mt-3">
          <Notice icon={Clock3}>
            <p>
              It was valid until {formatMoment(quotation.validUntil)} and can no longer be accepted. Your trip request
              stays open, and any updated quotation from Travora will appear with your request.
            </p>
          </Notice>
        </div>

        {latestLink}
      </section>
    );
  }

  /* ---------- ACCEPTED ---------- */

  if (quotation.status === "ACCEPTED") {
    const { state, record } = payment;

    return (
      <section aria-labelledby="quotation-action" data-testid="quotation-action" className="space-y-4">
        {noticeBlock}

        <div className="flex gap-3">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success-ink" />

          <div>
            <h2 id="quotation-action" ref={headingRef} tabIndex={-1} className={HEADING}>
              Quotation accepted
            </h2>

            <p className="mt-1 text-body-sm text-foreground-secondary">
              {state === "PAID"
                ? "You have accepted this quotation and your payment has been received."
                : state === "UNPAID" || state === "IN_PROGRESS"
                  ? "You have accepted this quotation. You can now continue to secure payment."
                  : "You have accepted this quotation."}
            </p>
          </div>
        </div>

        {payment.status === "loading" ? (
          <LoadingState label="Checking payment status" className="min-h-24" />
        ) : payment.status === "error" ? (
          <ErrorState
            headingLevel="h3"
            title="We couldn't check your payment status"
            description="Try again in a moment before starting a payment."
            onRetry={payment.retry}
          />
        ) : state === "PAID" ? (
          <div data-testid="quotation-paid" className="rounded-md border bg-sand-50 p-4">
            {record?.status === "REFUNDED" ? (
              <Notice icon={Wallet}>
                <p className="font-medium text-foreground">Payment refunded</p>
                <p className="mt-1">The payment for this quotation was refunded. There is nothing to pay.</p>
              </Notice>
            ) : record?.booking ? (
              <Notice icon={Wallet} tone="success">
                <p className="font-medium text-foreground">Payment received · Booking confirmed</p>
                <p className="mt-1">Your booking for this journey is confirmed.</p>
              </Notice>
            ) : (
              <Notice icon={Wallet}>
                <p className="font-medium text-foreground">Payment received</p>
                <p className="mt-1">
                  {quotation.tourRequest?.status === "BOOKED"
                    ? "This quotation is paid and booked. There is nothing more to pay."
                    : "This quotation is paid. Your booking is being finalized; there is nothing more to pay."}
                </p>
              </Notice>
            )}

            <Link
              href={
                record?.booking
                  ? `/tourist/bookings/${record.booking.id}`
                  : record
                    ? `/tourist/payments/${record.id}`
                    : "/tourist/bookings"
              }
              className={`${buttonVariants({ variant: "outline" })} mt-4 w-full`}
            >
              {record?.booking ? "View booking" : record ? "View payment" : "View bookings"}
            </Link>
          </div>
        ) : state === "AWAITING_CONFIRMATION" ? (
          <div data-testid="quotation-payment-confirming" className="rounded-md border bg-sand-50 p-4">
            <Notice icon={Wallet}>
              <p className="font-medium text-foreground">Payment processing</p>
              <p className="mt-1">Your payment is being processed. You don&apos;t need to pay again.</p>
            </Notice>

            {record && (
              <Link
                href={`/tourist/payments/${record.id}`}
                className={`${buttonVariants({ variant: "outline" })} mt-4 w-full`}
              >
                View payment
              </Link>
            )}
          </div>
        ) : state === "UNPAID" || state === "IN_PROGRESS" ? (
          <InitiatePaymentCard
            quotationId={quotation.id}
            amount={quotation.totalAmount}
            currency={quotation.currency}
            mode={state === "IN_PROGRESS" ? "resume" : "pay"}
          />
        ) : null}
      </section>
    );
  }

  /* ---------- REJECTED ---------- */

  if (quotation.status === "REJECTED") {
    return (
      <section aria-labelledby="quotation-action" data-testid="quotation-action">
        <h2 id="quotation-action" ref={headingRef} tabIndex={-1} className={HEADING}>
          Quotation rejected
        </h2>

        <div className="mt-3">
          <Notice icon={CircleX}>
            <p>You rejected this quotation. Your trip request stays open, and Travora may send you a revised quotation.</p>
          </Notice>
        </div>

        {latestLink}
      </section>
    );
  }

  /* ---------- SUPERSEDED ---------- */

  if (quotation.status === "SUPERSEDED") {
    return (
      <section aria-labelledby="quotation-action" data-testid="quotation-action">
        <h2 id="quotation-action" ref={headingRef} tabIndex={-1} className={HEADING}>
          Previous revision
        </h2>

        <div className="mt-3">
          <Notice icon={History}>
            <p>This quotation is no longer active. It was replaced by a newer revision or the request was closed.</p>
          </Notice>
        </div>

        {latestLink}
      </section>
    );
  }

  return null;
}
