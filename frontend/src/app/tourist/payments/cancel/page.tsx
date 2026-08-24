"use client";

import Link from "next/link";

import { ArrowLeft, CreditCard, XCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";

export default function PaymentCancelPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-12 sm:px-6">
      <Card className="w-full">
        <CardContent className="p-8 text-center sm:p-12">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
            <XCircle className="size-8 text-muted-foreground" />
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Payment cancelled
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Your payment was not completed
          </h1>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-muted-foreground">
            The Stripe checkout process was cancelled before payment was
            completed. Your quotation is still available and you can try the
            payment again.
          </p>

          <div className="mt-8 rounded-2xl border bg-muted/30 p-5 text-left">
            <p className="font-medium">You have not completed the payment</p>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Return to your quotations whenever you&apos;re ready and start the
              secure payment process again.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/tourist/quotations"
              className={buttonVariants({
                className: "sm:min-w-44",
              })}
            >
              <ArrowLeft className="size-4" />
              Back to quotations
            </Link>

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
          </div>
        </CardContent>
      </Card>
    </main>
  );
}