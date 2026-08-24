"use client";

import Link from "next/link";

import { CheckCircle2, CreditCard, CalendarCheck2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";

export default function PaymentSuccessPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-12 sm:px-6">
      <Card className="w-full">
        <CardContent className="p-8 text-center sm:p-12">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="size-8 text-green-700" />
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Payment complete
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Your payment was successful
          </h1>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-muted-foreground">
            Stripe has successfully processed your payment. Travora has received
            the confirmation and your booking is being prepared automatically.
          </p>

          <div className="mt-8 rounded-2xl border bg-muted/30 p-5 text-left">
            <p className="font-medium">What happens next?</p>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Your confirmed booking should now appear under My Bookings. You
              can also review the completed transaction from your payment
              history.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/tourist/bookings"
              className={buttonVariants({
                className: "sm:min-w-44",
              })}
            >
              <CalendarCheck2 className="size-4" />
              View bookings
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