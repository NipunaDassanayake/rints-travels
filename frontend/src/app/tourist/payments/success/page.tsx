"use client";

import { Suspense, useEffect, useState } from "react";

import Link from "next/link";

import { useSearchParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  CreditCard,
  LoaderCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";

import { getPaymentById } from "@/features/payments/payment.api";

import { formatMoney } from "@/lib/format";

import type { Payment } from "@/features/payments/payment.types";

/**
 * =========================================================
 * Confirmation Polling
 * =========================================================
 *
 * The Stripe redirect to this page is NOT proof of payment.
 * The backend only marks a payment SUCCESS (and creates the
 * booking) after a verified Stripe webhook, so this page polls
 * the payment until the backend reports a confirmed booking.
 */

const POLL_INTERVAL_MS = 2_000;

const DELAYED_POLL_INTERVAL_MS = 5_000;

const CONFIRMATION_DELAY_MS = 30_000;

const NOT_COMPLETED_STATUSES: Payment["status"][] = [
  "FAILED",
  "CANCELLED",
  "REFUNDED",
];

type ConfirmationState =
  | "confirming"
  | "confirmed"
  | "delayed"
  | "not-completed"
  | "error";

function isConfirmed(payment: Payment | undefined) {
  return payment?.status === "SUCCESS" && Boolean(payment.booking);
}

function isNotCompleted(payment: Payment | undefined) {
  return Boolean(payment && NOT_COMPLETED_STATUSES.includes(payment.status));
}

function getConfirmationState({
  payment,
  isError,
  isDelayed,
}: {
  payment: Payment | undefined;
  isError: boolean;
  isDelayed: boolean;
}): ConfirmationState {
  if (isConfirmed(payment)) {
    return "confirmed";
  }

  if (isNotCompleted(payment)) {
    return "not-completed";
  }

  if (isError && !payment) {
    return "error";
  }

  return isDelayed ? "delayed" : "confirming";
}

/**
 * =========================================================
 * Presentation
 * =========================================================
 */

const STATE_CONTENT: Record<
  ConfirmationState,
  {
    eyebrow: string;
    title: string;
    description: string;
  }
> = {
  confirming: {
    eyebrow: "Confirming payment",
    title: "Confirming your payment",
    description:
      "We're waiting for Stripe to confirm your payment with Travora. This usually takes a few seconds, so please keep this page open.",
  },

  confirmed: {
    eyebrow: "Payment confirmed",
    title: "Your booking is confirmed",
    description:
      "Stripe has confirmed your payment and Travora has created your booking.",
  },

  delayed: {
    eyebrow: "Still confirming",
    title: "Confirmation is taking longer than usual",
    description:
      "Stripe hasn't confirmed your payment with Travora yet. You don't need to pay again. We'll keep checking, and your booking will appear under My Bookings once the payment is confirmed.",
  },

  "not-completed": {
    eyebrow: "Payment not completed",
    title: "Your payment was not completed",
    description:
      "Travora has not received a successful payment for this checkout. Review your payment history for details.",
  },

  error: {
    eyebrow: "Unable to check payment",
    title: "We couldn't check this payment",
    description:
      "The payment could not be loaded or you may not have permission to view it. Any completed payment is still confirmed automatically by Travora.",
  },
};

/**
 * The delayed state covers two situations: the payment itself is
 * still unconfirmed, or the payment succeeded and only the
 * booking is still being created.
 */
const BOOKING_PENDING_DESCRIPTION =
  "Your payment has been received, but your booking is still being finalized. You don't need to pay again. We'll keep checking, and your booking will appear under My Bookings as soon as it's ready.";

function getDescription(state: ConfirmationState, payment?: Payment) {
  if (state === "delayed" && payment?.status === "SUCCESS") {
    return BOOKING_PENDING_DESCRIPTION;
  }

  return STATE_CONTENT[state].description;
}

function StateIcon({ state }: { state: ConfirmationState }) {
  if (state === "confirmed") {
    return (
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-soft">
        <CheckCircle2 aria-hidden="true" className="size-8 text-success-ink" />
      </div>
    );
  }

  if (state === "delayed") {
    return (
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-warning-soft">
        <Clock3 aria-hidden="true" className="size-8 text-warning-ink" />
      </div>
    );
  }

  if (state === "not-completed") {
    return (
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
        <XCircle aria-hidden="true" className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-danger-soft">
        <AlertTriangle aria-hidden="true" className="size-8 text-danger-ink" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
      <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function ConfirmationCard({
  state,
  payment,
  onRetry,
}: {
  state: ConfirmationState;
  payment?: Payment;
  onRetry?: () => void;
}) {
  const content = STATE_CONTENT[state];

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-12 sm:px-6">
      <Card className="w-full">
        <CardContent className="p-8 text-center sm:p-12">
          <StateIcon state={state} />

          {/* Only the changing message is announced, not the actions. */}
          <div role="status" aria-live="polite">
            <p className="mt-6 text-overline text-tea-700">
              {content.eyebrow}
            </p>

            <h1 className="mt-2 font-display text-display-md text-foreground">
              {content.title}
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-body text-foreground-secondary">
              {getDescription(state, payment)}
            </p>
          </div>

          {payment && (
            <div className="mt-8 rounded-2xl border bg-muted/30 p-5 text-left">
              <p className="text-sm text-muted-foreground">Payment reference</p>

              <p className="mt-1 font-medium">{payment.paymentReference}</p>

              <p className="mt-3 text-sm text-muted-foreground">Amount</p>

              <p className="mt-1 font-medium">
                {formatMoney(payment.amount, payment.currency)}
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {state === "confirmed" && payment?.booking ? (
              <Link
                href={`/tourist/bookings/${payment.booking.id}`}
                className={buttonVariants({
                  className: "sm:min-w-44",
                })}
              >
                <CalendarCheck2 className="size-4" />
                View booking
              </Link>
            ) : (
              <Link
                href="/tourist/bookings"
                className={buttonVariants({
                  className: "sm:min-w-44",
                })}
              >
                <CalendarCheck2 className="size-4" />
                View bookings
              </Link>
            )}

            <Link
              href="/tourist/payments"
              className={buttonVariants({
                variant: "outline",
                className: "sm:min-w-44",
              })}
            >
              <CreditCard className="size-4" />
              View payments
            </Link>

            {state === "error" && onRetry && (
              <Button
                variant="outline"
                className="sm:min-w-44"
                onClick={onRetry}
              >
                <RefreshCw className="size-4" />
                Try again
              </Button>
            )}
          </div>

          <Link
            href="/"
            className="mt-6 inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Return to Travora
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * =========================================================
 * Confirmation
 * =========================================================
 */

function PaymentConfirmation() {
  const searchParams = useSearchParams();

  const paymentId = searchParams.get("paymentId") ?? "";

  const [isDelayed, setIsDelayed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDelayed(true);
    }, CONFIRMATION_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const {
    data: payment,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["payment", paymentId, "confirmation"],

    queryFn: () => getPaymentById(paymentId),

    enabled: Boolean(paymentId),

    retry: 1,

    refetchInterval: (query) => {
      const current = query.state.data;

      if (isConfirmed(current) || isNotCompleted(current)) {
        return false;
      }

      if (query.state.status === "error" && !current) {
        return false;
      }

      return isDelayed ? DELAYED_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
    },
  });

  if (!paymentId) {
    return <ConfirmationCard state="error" />;
  }

  const state = getConfirmationState({
    payment,
    isError,
    isDelayed,
  });

  return (
    <ConfirmationCard
      state={state}
      payment={payment}
      onRetry={() => {
        void refetch();
      }}
    />
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<ConfirmationCard state="confirming" />}>
      <PaymentConfirmation />
    </Suspense>
  );
}
