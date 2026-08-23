"use client";

import { useMutation } from "@tanstack/react-query";

import { CreditCard, LoaderCircle, LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { createCheckoutSession } from "@/features/payments/payment.api";

interface InitiatePaymentCardProps {
  quotationId: string;

  amount: string;

  currency: string;
}

export function InitiatePaymentCard({
  quotationId,
  amount,
  currency,
}: InitiatePaymentCardProps) {
  const mutation = useMutation({
    mutationFn: () =>
      createCheckoutSession({
        quotationId,
      }),

    onSuccess: (checkout) => {
      window.location.href = checkout.checkoutUrl;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div>
          <p className="text-sm text-muted-foreground">Amount to pay</p>

          <p className="mt-1 text-2xl font-bold">
            {currency} {amount}
          </p>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex gap-3">
            <LockKeyhole className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

            <div>
              <p className="font-medium">Secure card payment</p>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                You&apos;ll be redirected to Stripe&apos;s secure checkout page
                to complete your payment.
              </p>
            </div>
          </div>
        </div>

        {mutation.isError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">
              Unable to start payment
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Please try again in a moment.
            </p>
          </div>
        )}

        <Button
          className="w-full"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Redirecting to Stripe...
            </>
          ) : (
            <>
              <CreditCard className="size-4" />
              Pay {currency} {amount}
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Payment is processed securely by Stripe.
        </p>
      </CardContent>
    </Card>
  );
}