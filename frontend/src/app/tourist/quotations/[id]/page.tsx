"use client";

import Link from "next/link";

import { useParams } from "next/navigation";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  CircleCheck,
  LoaderCircle,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ConfirmDialog } from "@/components/patterns/confirm-dialog";

import { ErrorState } from "@/components/patterns/error-state";

import { LoadingState } from "@/components/patterns/loading-state";

import {
  acceptQuotation,
  getQuotationById,
} from "@/features/quotations/quotation.api";

import { ProposedGuideCard } from "@/features/quotations/components/proposed-guide-card";

import { RejectQuotationDialog } from "@/features/quotations/components/reject-quotation-dialog";

import { getMyPayments } from "@/features/payments/payment.api";

import { getQuotationPaymentState } from "@/features/journeys/journey";

import { formatMoney } from "@/lib/format";

import { InitiatePaymentCard } from "@/features/payments/components/initiate-payment-card";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not specified";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function TouristQuotationPage() {
  const params = useParams<{
    id: string;
  }>();

  const quotationId = params.id;

  const queryClient = useQueryClient();

  const [confirmAcceptOpen, setConfirmAcceptOpen] = useState(false);

  const {
    data: quotation,

    isLoading,

    isError,
  } = useQuery({
    queryKey: ["quotation", quotationId],

    queryFn: () => getQuotationById(quotationId),

    enabled: Boolean(quotationId),
  });

  /**
   * =========================================================
   * Accept Quotation
   * =========================================================
   */

  const acceptMutation = useMutation({
    mutationFn: () => acceptQuotation(quotationId),

    onSuccess: async (updatedQuotation) => {
      await queryClient.invalidateQueries({
        queryKey: ["quotation", quotationId],
      });

      await queryClient.invalidateQueries({
        queryKey: [
          "tour-request",
          updatedQuotation.tourRequestId,
          "quotations",
        ],
      });

      await queryClient.invalidateQueries({
        queryKey: ["tour-request", updatedQuotation.tourRequestId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["tour-requests", "me"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["quotations", "me"],
      });
    },
  });

  /**
   * =========================================================
   * Payment state (CR-030)
   * =========================================================
   *
   * ACCEPTED does not tell paid from unpaid, so the traveler's
   * payments decide whether payment is still offered.
   */

  const payments = useQuery({
    queryKey: ["payments", "me"],

    queryFn: getMyPayments,

    enabled: quotation?.status === "ACCEPTED",
  });

  /**
   * =========================================================
   * Loading
   * =========================================================
   */

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  /**
   * =========================================================
   * Error
   * =========================================================
   */

  if (isError || !quotation) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">Unable to load quotation</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            The quotation could not be loaded or you may not have permission to
            view it.
          </p>

          <Link
            href="/tourist"
            className={`${buttonVariants({
              variant: "outline",
            })} mt-5`}
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const isSent = quotation.status === "SENT";

  const isAccepted = quotation.status === "ACCEPTED";

  const isRejected = quotation.status === "REJECTED";

  const paymentInfo =
    isAccepted && payments.data
      ? getQuotationPaymentState(quotation, payments.data)
      : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="mb-8">
        <Link
          href={`/tourist/requests/${quotation.tourRequestId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to request
        </Link>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              Quotation
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {quotation.title}
            </h1>

            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>{quotation.quotationNumber}</p>

              <p>Revision {quotation.revisionNumber}</p>
            </div>
          </div>

          <span className="rounded-full border px-4 py-2 text-sm font-medium">
            {formatStatus(quotation.status)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ===================================================
            MAIN CONTENT
        ==================================================== */}

        <div className="space-y-6">
          {/* Tour Summary */}

          <Card>
            <CardHeader>
              <CardTitle>Tour summary</CardTitle>
            </CardHeader>

            <CardContent>
              {quotation.description && (
                <p className="mb-6 leading-7 text-muted-foreground">
                  {quotation.description}
                </p>
              )}

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex gap-3">
                  <CalendarDays className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Travel dates
                    </p>

                    <p className="mt-1 font-medium">
                      {formatDate(quotation.startDate)}

                      {" → "}

                      {formatDate(quotation.endDate)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Users className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">Travelers</p>

                    <p className="mt-1 font-medium">
                      {quotation.adultCount} adult
                      {quotation.adultCount !== 1 ? "s" : ""}
                      {" · "}
                      {quotation.childCount} child
                      {quotation.childCount !== 1 ? "ren" : ""}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Proposed guide (CR-030) */}

          {quotation.guide && <ProposedGuideCard guide={quotation.guide} />}

          {/* Itinerary */}

          {quotation.itineraries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Itinerary</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-6">
                  {[...quotation.itineraries]
                    .sort((a, b) => a.dayNumber - b.dayNumber)
                    .map((item) => (
                      <div
                        key={`${item.dayNumber}-${item.title}`}
                        className="grid gap-3 border-l-2 pl-5 sm:grid-cols-[90px_1fr]"
                      >
                        <p className="font-semibold text-primary">
                          Day {item.dayNumber}
                        </p>

                        <div>
                          <h3 className="font-semibold">{item.title}</h3>

                          <p className="mt-2 leading-7 text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inclusions */}

          <Card>
            <CardHeader>
              <CardTitle>What&apos;s included</CardTitle>
            </CardHeader>

            <CardContent>
              {quotation.inclusions.length > 0 ? (
                <div className="space-y-3">
                  {quotation.inclusions.map((item) => (
                    <div key={item.id ?? item.title} className="flex gap-3">
                      <Check className="mt-0.5 size-5 shrink-0 text-primary" />

                      <span>{item.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No inclusions were listed.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Exclusions */}

          <Card>
            <CardHeader>
              <CardTitle>What&apos;s not included</CardTitle>
            </CardHeader>

            <CardContent>
              {quotation.exclusions.length > 0 ? (
                <div className="space-y-3">
                  {quotation.exclusions.map((item) => (
                    <div key={item.id ?? item.title} className="flex gap-3">
                      <X className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

                      <span>{item.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No exclusions were listed.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Additional Information */}

          {(quotation.notes || quotation.termsConditions) && (
            <Card>
              <CardHeader>
                <CardTitle>Additional information</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {quotation.notes && (
                  <div>
                    <p className="text-sm font-medium">Notes</p>

                    <p className="mt-2 whitespace-pre-line leading-7 text-muted-foreground">
                      {quotation.notes}
                    </p>
                  </div>
                )}

                {quotation.termsConditions && (
                  <div>
                    <p className="text-sm font-medium">
                      Terms &amp; conditions
                    </p>

                    <p className="mt-2 whitespace-pre-line leading-7 text-muted-foreground">
                      {quotation.termsConditions}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ===================================================
            SIDEBAR
        ==================================================== */}

        <aside className="space-y-6">
          {/* Price Summary */}

          <Card>
            <CardHeader>
              <CardTitle>Price summary</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Subtotal</span>

                <span className="font-medium">
                  {quotation.currency} {quotation.subtotal}
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Discount</span>

                <span className="font-medium">
                  - {quotation.currency} {quotation.discountAmount}
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Tax</span>

                <span className="font-medium">
                  {quotation.currency} {quotation.taxAmount}
                </span>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-end justify-between gap-4">
                  <span className="font-medium">Total</span>

                  <span className="text-2xl font-bold">
                    {quotation.currency} {quotation.totalAmount}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quotation Details */}

          <Card>
            <CardHeader>
              <CardTitle>Quotation details</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>

                <p className="mt-1 font-medium">
                  {formatStatus(quotation.status)}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Valid until</p>

                <p className="mt-1 font-medium">
                  {formatDate(quotation.validUntil)}
                </p>
              </div>

              {quotation.sentAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Sent on</p>

                  <p className="mt-1 font-medium">
                    {formatDate(quotation.sentAt)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SENT */}

          {isSent && (
            <Card>
              <CardHeader>
                <CardTitle>Your response</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-sm leading-6 text-muted-foreground">
                  Review the complete quotation before accepting or rejecting
                  it.
                </p>

                <Button
                  className="w-full"
                  aria-haspopup="dialog"
                  disabled={acceptMutation.isPending}
                  onClick={() => {
                    acceptMutation.reset();

                    setConfirmAcceptOpen(true);
                  }}
                >
                  <CircleCheck className="size-4" />

                  {acceptMutation.isPending
                    ? "Accepting..."
                    : "Accept quotation"}
                </Button>

                <ConfirmDialog
                  open={confirmAcceptOpen}
                  onOpenChange={setConfirmAcceptOpen}
                  title="Accept this quotation?"
                  description={
                    <>
                      By accepting, you agree to proceed with this quotation
                      for {formatMoney(quotation.totalAmount, quotation.currency)}.
                      You can then complete payment to confirm your booking.
                      {acceptMutation.isError && (
                        <span role="alert" className="mt-3 block font-medium text-destructive">
                          Unable to accept the quotation. Please try again.
                        </span>
                      )}
                    </>
                  }
                  confirmLabel="Yes, accept quotation"
                  cancelLabel="Keep reviewing"
                  onConfirm={async () => {
                    await acceptMutation.mutateAsync();
                  }}
                />

                <RejectQuotationDialog
                  quotationId={quotation.id}
                  tourRequestId={quotation.tourRequestId}
                />

                {acceptMutation.isError && (
                  <p className="text-sm text-destructive">
                    Unable to accept the quotation. Please try again.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ACCEPTED */}

          {isAccepted && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <CircleCheck className="mt-0.5 size-5 shrink-0 text-primary" />

                    <div>
                      <p className="font-semibold">Quotation accepted</p>

                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {paymentInfo?.state === "PAID"
                          ? "You have accepted this quotation and your payment has been received."
                          : paymentInfo?.state === "UNPAID" ||
                              paymentInfo?.state === "IN_PROGRESS"
                            ? "You have accepted this quotation. You can now continue to secure payment."
                            : "You have accepted this quotation."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* PAYMENT (CR-030: never offered once paid) */}

              {payments.isPending ? (
                <LoadingState label="Checking payment status" />
              ) : payments.isError ? (
                <ErrorState
                  headingLevel="h2"
                  title="We couldn't check your payment status"
                  description="Try again in a moment before starting a payment."
                  onRetry={() => void payments.refetch()}
                />
              ) : paymentInfo?.state === "PAID" ? (
                <Card data-testid="quotation-paid">
                  <CardContent className="pt-6">
                    <div className="flex gap-3">
                      <Wallet className="mt-0.5 size-5 shrink-0 text-primary" />

                      <div>
                        <p className="font-semibold">Payment received</p>

                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          This quotation is paid. There is nothing more to pay.
                        </p>

                        <Link
                          href={
                            paymentInfo.payment?.booking
                              ? `/tourist/bookings/${paymentInfo.payment.booking.id}`
                              : paymentInfo.payment
                                ? `/tourist/payments/${paymentInfo.payment.id}`
                                : "/tourist/bookings"
                          }
                          className={`${buttonVariants({ variant: "outline" })} mt-4`}
                        >
                          {paymentInfo.payment?.booking
                            ? "View booking"
                            : paymentInfo.payment
                              ? "View payment"
                              : "View bookings"}
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : paymentInfo?.state === "AWAITING_CONFIRMATION" ? (
                <Card data-testid="quotation-payment-confirming">
                  <CardContent className="pt-6">
                    <div className="flex gap-3">
                      <Wallet className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

                      <div>
                        <p className="font-semibold">Payment processing</p>

                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          Your payment is being processed. Check its status on the
                          payment page.
                        </p>

                        {paymentInfo.payment && (
                          <Link
                            href={`/tourist/payments/${paymentInfo.payment.id}`}
                            className={`${buttonVariants({ variant: "outline" })} mt-4`}
                          >
                            View payment
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : paymentInfo?.state === "UNPAID" ||
                paymentInfo?.state === "IN_PROGRESS" ? (
                <InitiatePaymentCard
                  quotationId={quotation.id}
                  amount={quotation.totalAmount}
                  currency={quotation.currency}
                />
              ) : null}
            </>
          )}

          {/* REJECTED */}

          {isRejected && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <X className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="font-semibold">Quotation rejected</p>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      This quotation has been rejected.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* EXPIRED */}

          {quotation.status === "EXPIRED" && (
            <Card>
              <CardContent className="pt-6">
                <p className="font-semibold">Quotation expired</p>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This quotation is no longer valid. Please contact the travel
                  agency for a revised quotation.
                </p>
              </CardContent>
            </Card>
          )}

          {/* SUPERSEDED */}

          {quotation.status === "SUPERSEDED" && (
            <Card>
              <CardContent className="pt-6">
                <p className="font-semibold">Previous revision</p>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This quotation is no longer active. It was replaced by a
                  newer revision or the request was closed.
                </p>
              </CardContent>
            </Card>
          )}

          {/* PAYMENT LOCKED */}

          {!isAccepted && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Wallet className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

                  <p className="text-sm leading-6 text-muted-foreground">
                    Payment becomes available only after the quotation has been
                    accepted.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </main>
  );
}