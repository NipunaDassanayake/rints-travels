"use client";

import { Suspense } from "react";

import Link from "next/link";

import { useSearchParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import { ArrowLeft, Route, XCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";

import { getPaymentById } from "@/features/payments/payment.api";

import { cn } from "@/lib/utils";

/**
 * =========================================================
 * Checkout cancelled (CR-030 Stage 4)
 * =========================================================
 *
 * Stripe sends the traveler here after leaving checkout without
 * paying. Nothing was charged and nothing about the trip changed.
 * The payment id (when present) only helps link back to the
 * quotation; if it is missing or cannot be read, the page stays
 * just as useful with general links.
 */
function CancelledCheckout({ paymentId }: { paymentId: string }) {
  const { data: payment } = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: () => getPaymentById(paymentId),
    enabled: Boolean(paymentId),
    retry: false,
  });

  const alreadyPaid = payment?.status === "SUCCESS";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-12 sm:px-6">
      <Card className="w-full">
        <CardContent className="p-8 text-center sm:p-12">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-sand-100">
            <XCircle aria-hidden="true" className="size-8 text-muted-foreground" />
          </div>

          <p className="mt-6 text-overline text-tea-700">Checkout cancelled</p>

          <h1 className="mt-2 font-display text-display-md text-foreground">Your payment was not completed</h1>

          <p className="mx-auto mt-4 max-w-xl text-body text-foreground-secondary">
            You left the secure Stripe checkout before paying, so no payment was taken. Your trip plans and quotation
            are unchanged, and you can complete the payment whenever you&apos;re ready.
          </p>

          {payment && (
            <div className="mt-8 rounded-card border bg-sand-50 p-5 text-left" data-testid="cancel-context">
              <p className="text-caption text-muted-foreground">Quotation</p>

              <p className="mt-1 font-medium text-foreground">{payment.quotation.title}</p>

              <p className="mt-1 text-caption text-muted-foreground">{payment.quotation.quotationNumber}</p>

              {alreadyPaid && (
                <p className="mt-3 text-body-sm text-foreground-secondary">
                  This quotation has since been paid, so there is nothing more to pay.
                </p>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {payment ? (
              <Link
                href={alreadyPaid ? `/tourist/payments/${payment.id}` : `/tourist/quotations/${payment.quotationId}`}
                className={cn(buttonVariants(), "sm:min-w-44")}
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                {alreadyPaid ? "View payment" : "Return to quotation"}
              </Link>
            ) : (
              <Link href="/tourist/quotations" className={cn(buttonVariants(), "sm:min-w-44")}>
                <ArrowLeft aria-hidden="true" className="size-4" />
                View my quotations
              </Link>
            )}

            <Link href="/tourist/requests" className={cn(buttonVariants({ variant: "outline" }), "sm:min-w-44")}>
              <Route aria-hidden="true" className="size-4" />
              View my journeys
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function CancelPageContent() {
  const searchParams = useSearchParams();

  return <CancelledCheckout paymentId={searchParams.get("paymentId") ?? ""} />;
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={<CancelledCheckout paymentId="" />}>
      <CancelPageContent />
    </Suspense>
  );
}
