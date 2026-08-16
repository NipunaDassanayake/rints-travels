"use client";

import { useState } from "react";

import { useMutation } from "@tanstack/react-query";

import { CreditCard, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { initiatePayment } from "@/features/payments/payment.api";

import type { Payment, PaymentMethod } from "@/features/payments/payment.types";

interface InitiatePaymentCardProps {
  quotationId: string;
  amount: string;
  currency: string;

  onPaymentCreated?: (payment: Payment) => void;
}

export function InitiatePaymentCard({
  quotationId,
  amount,
  currency,
  onPaymentCreated,
}: InitiatePaymentCardProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CARD");

  const mutation = useMutation({
    mutationFn: () =>
      initiatePayment({
        quotationId,
        paymentMethod,
      }),

    onSuccess: (payment) => {
      onPaymentCreated?.(payment);
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

        <div className="space-y-2">
          <label htmlFor="payment-method" className="text-sm font-medium">
            Payment method
          </label>

          <select
            id="payment-method"
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(event.target.value as PaymentMethod)
            }
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="CARD">Card</option>

            <option value="BANK_TRANSFER">Bank Transfer</option>

            <option value="CASH">Cash</option>

            <option value="OTHER">Other</option>
          </select>
        </div>

        <p className="text-sm leading-6 text-muted-foreground">
          This currently creates a pending payment record. A real payment
          gateway will be connected later.
        </p>

        {mutation.isError && (
          <p className="text-sm text-destructive">
            Unable to initiate payment.
          </p>
        )}

        <Button
          className="w-full"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Creating payment...
            </>
          ) : (
            <>
              <CreditCard className="size-4" />
              Proceed to payment
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}