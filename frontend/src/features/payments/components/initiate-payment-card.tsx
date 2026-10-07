"use client";

import { useState } from "react";

import { useMutation } from "@tanstack/react-query";

import { CreditCard, LoaderCircle, LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";

import { createCheckoutSession } from "@/features/payments/payment.api";

import { formatMoney } from "@/lib/format";

/**
 * Only 409 conflicts carry a message meant for the tourist
 * (checkout still being prepared, already paid, awaiting
 * confirmation). Anything else falls back to generic copy.
 */
function getConflictMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: {
          status?: number;
          data?: {
            message?: string;
          };
        };
      }
    ).response;

    if (response?.status === 409 && response.data?.message) {
      return response.data.message;
    }
  }

  return null;
}

interface InitiatePaymentCardProps {
  quotationId: string;

  amount: string;

  currency: string;

  /**
   * "resume" when a payment for this quotation was already started
   * (PENDING): the same checkout endpoint reuses or renews its
   * Stripe session, so it is presented as continuing, not as a new
   * payment (CR-030 Stage 4).
   */
  mode?: "pay" | "resume";
}

export function InitiatePaymentCard({
  quotationId,
  amount,
  currency,
  mode = "pay",
}: InitiatePaymentCardProps) {
  // Once checkout is ready the browser is leaving for Stripe: stay
  // locked so a further click cannot start another request.
  const [redirecting, setRedirecting] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      createCheckoutSession({
        quotationId,
      }),

    onSuccess: (checkout) => {
      setRedirecting(true);

      window.location.href = checkout.checkoutUrl;
    },
  });

  const total = formatMoney(amount, currency);

  const busy = mutation.isPending || redirecting;

  return (
    <div data-testid="initiate-payment" className="space-y-4">
      <div>
        <p className="text-body-sm text-muted-foreground">
          {mode === "resume" ? "Amount still to pay" : "Amount to pay"}
        </p>

        <p className="mt-1 text-heading-lg text-foreground">{total}</p>
      </div>

      <div className="flex gap-3 rounded-md border bg-sand-50 p-4">
        <LockKeyhole aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

        <div>
          <p className="font-medium text-foreground">
            {mode === "resume" ? "Payment already started" : "Secure card payment"}
          </p>

          <p className="mt-1 text-body-sm text-muted-foreground">
            {mode === "resume"
              ? "You started this payment earlier. Resume it to finish on Stripe's secure checkout page."
              : "You'll be redirected to Stripe's secure checkout page to complete your payment."}
          </p>
        </div>
      </div>

      {mutation.isError && (
        <div role="alert" className="rounded-md border border-danger-border bg-danger-soft p-4">
          <p className="text-body-sm font-medium text-danger-ink">Unable to start payment</p>

          <p className="mt-1 text-body-sm text-foreground-secondary">
            {getConflictMessage(mutation.error) ?? "Please try again in a moment."}
          </p>
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        disabled={busy}
        onClick={() => {
          if (!busy) {
            mutation.mutate();
          }
        }}
      >
        {busy ? (
          <>
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Redirecting to Stripe...
          </>
        ) : (
          <>
            <CreditCard aria-hidden="true" className="size-4" />
            {mode === "resume" ? `Resume payment of ${total}` : `Pay ${total}`}
          </>
        )}
      </Button>

      <p className="text-center text-caption text-muted-foreground">Payment is processed securely by Stripe.</p>
    </div>
  );
}
