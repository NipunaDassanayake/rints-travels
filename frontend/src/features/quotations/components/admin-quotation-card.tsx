"use client";

import { useMemo, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CalendarDays, LoaderCircle, Pencil, Send } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";

import {
  sendQuotation,
  updateQuotation,
} from "@/features/quotations/quotation.api";

import type { Quotation } from "@/features/quotations/quotation.types";

interface AdminQuotationCardProps {
  quotation: Quotation;
  requestId: string;
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

export function AdminQuotationCard({
  quotation,
  requestId,
}: AdminQuotationCardProps) {
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);

  const [title, setTitle] = useState(quotation.title);

  const [description, setDescription] = useState(quotation.description ?? "");

  const [startDate, setStartDate] = useState(
    toDateInputValue(quotation.startDate),
  );

  const [endDate, setEndDate] = useState(toDateInputValue(quotation.endDate));

  const [adultCount, setAdultCount] = useState(String(quotation.adultCount));

  const [childCount, setChildCount] = useState(String(quotation.childCount));

  const [subtotal, setSubtotal] = useState(quotation.subtotal);

  const [discountAmount, setDiscountAmount] = useState(
    quotation.discountAmount,
  );

  const [taxAmount, setTaxAmount] = useState(quotation.taxAmount);

  const [currency, setCurrency] = useState(quotation.currency);

  const [notes, setNotes] = useState(quotation.notes ?? "");

  const [termsConditions, setTermsConditions] = useState(
    quotation.termsConditions ?? "",
  );

  const [validUntil, setValidUntil] = useState(
    toDateInputValue(quotation.validUntil),
  );

  /**
   * Recalculate instead of manually editing total.
   */
  const calculatedTotal = useMemo(() => {
    const subtotalValue = Number(subtotal) || 0;

    const discountValue = Number(discountAmount) || 0;

    const taxValue = Number(taxAmount) || 0;

    return Math.max(subtotalValue - discountValue + taxValue, 0);
  }, [subtotal, discountAmount, taxAmount]);

  const resetEditValues = () => {
    setTitle(quotation.title);

    setDescription(quotation.description ?? "");

    setStartDate(toDateInputValue(quotation.startDate));

    setEndDate(toDateInputValue(quotation.endDate));

    setAdultCount(String(quotation.adultCount));

    setChildCount(String(quotation.childCount));

    setSubtotal(quotation.subtotal);

    setDiscountAmount(quotation.discountAmount);

    setTaxAmount(quotation.taxAmount);

    setCurrency(quotation.currency);

    setNotes(quotation.notes ?? "");

    setTermsConditions(quotation.termsConditions ?? "");

    setValidUntil(toDateInputValue(quotation.validUntil));
  };

  const refreshQueries = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["admin", "tour-request", requestId],
    });

    await queryClient.invalidateQueries({
      queryKey: ["tour-request", requestId, "quotations"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["admin", "tour-requests"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["tour-request", requestId],
    });
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      updateQuotation(quotation.id, {
        title: title.trim(),

        description: description.trim() || null,

        startDate,

        endDate,

        adultCount: Number(adultCount),

        childCount: Number(childCount),

        subtotal: Number(subtotal),

        discountAmount: Number(discountAmount) || 0,

        taxAmount: Number(taxAmount) || 0,

        totalAmount: calculatedTotal,

        currency: currency.trim().toUpperCase(),

        notes: notes.trim() || null,

        termsConditions: termsConditions.trim() || null,

        validUntil: validUntil || null,
      }),

    onSuccess: async () => {
      await refreshQueries();

      setIsEditing(false);
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => sendQuotation(quotation.id),

    onSuccess: async () => {
      await refreshQueries();
    },
  });

  const isDraft = quotation.status === "DRAFT";

  const isUpdateInvalid =
    !title.trim() ||
    title.trim().length < 3 ||
    !startDate ||
    !endDate ||
    endDate < startDate ||
    Number(adultCount) < 1 ||
    Number(childCount) < 0 ||
    Number(subtotal) <= 0 ||
    calculatedTotal <= 0 ||
    !currency.trim();

  /**
   * =========================================================
   * Editing
   * =========================================================
   */

  if (isEditing) {
    return (
      <div className="space-y-5 rounded-xl border p-5">
        <div>
          <h3 className="font-semibold">Edit quotation</h3>

          <p className="mt-1 text-sm text-muted-foreground">
            Only draft quotations can be edited.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Title</Label>

          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>

          <Textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Start date</Label>

            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>End date</Label>

            <Input
              type="date"
              min={startDate || undefined}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Adults</Label>

            <Input
              type="number"
              min="1"
              value={adultCount}
              onChange={(event) => setAdultCount(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Children</Label>

            <Input
              type="number"
              min="0"
              value={childCount}
              onChange={(event) => setChildCount(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Subtotal</Label>

            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={subtotal}
              onChange={(event) => setSubtotal(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>

            <Input
              maxLength={10}
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Discount</Label>

            <Input
              type="number"
              step="0.01"
              min="0"
              value={discountAmount}
              onChange={(event) => setDiscountAmount(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Tax</Label>

            <Input
              type="number"
              step="0.01"
              min="0"
              value={taxAmount}
              onChange={(event) => setTaxAmount(event.target.value)}
            />
          </div>
        </div>

        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">Total</p>

          <p className="mt-1 text-2xl font-bold">
            {currency || "USD"} {calculatedTotal.toFixed(2)}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Valid until</Label>

          <Input
            type="date"
            value={validUntil}
            onChange={(event) => setValidUntil(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>

          <Textarea
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Terms &amp; conditions</Label>

          <Textarea
            rows={4}
            value={termsConditions}
            onChange={(event) => setTermsConditions(event.target.value)}
          />
        </div>

        {updateMutation.isError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">
              {getErrorMessage(updateMutation.error)}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            className="flex-1"
            disabled={updateMutation.isPending || isUpdateInvalid}
            onClick={() => updateMutation.mutate()}
          >
            {updateMutation.isPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save quotation"
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={updateMutation.isPending}
            onClick={() => {
              resetEditValues();

              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  /**
   * =========================================================
   * Card
   * =========================================================
   */

  return (
    <div className="space-y-4 rounded-xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {quotation.quotationNumber}
          </p>

          <h3 className="mt-1 text-lg font-semibold">{quotation.title}</h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Revision {quotation.revisionNumber}
          </p>
        </div>

        <span className="rounded-full border px-3 py-1 text-xs font-medium">
          {formatStatus(quotation.status)}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="size-4" />

        <span>
          {toDateInputValue(quotation.startDate)}

          {" → "}

          {toDateInputValue(quotation.endDate)}
        </span>
      </div>

      <div className="rounded-lg bg-muted/40 p-4">
        <p className="text-sm text-muted-foreground">Total quotation</p>

        <p className="mt-1 text-2xl font-bold">
          {quotation.currency} {quotation.totalAmount}
        </p>

        <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div>
            <p>Subtotal</p>

            <p className="mt-1 font-medium text-foreground">
              {quotation.subtotal}
            </p>
          </div>

          <div>
            <p>Discount</p>

            <p className="mt-1 font-medium text-foreground">
              {quotation.discountAmount}
            </p>
          </div>

          <div>
            <p>Tax</p>

            <p className="mt-1 font-medium text-foreground">
              {quotation.taxAmount}
            </p>
          </div>
        </div>
      </div>

      {quotation.validUntil && (
        <p className="text-sm text-muted-foreground">
          Valid until: {toDateInputValue(quotation.validUntil)}
        </p>
      )}

      {isDraft && (
        <div className="space-y-2 border-t pt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              resetEditValues();

              setIsEditing(true);
            }}
          >
            <Pencil className="size-4" />
            Edit quotation
          </Button>

          <Button
            className="w-full"
            disabled={sendMutation.isPending}
            onClick={() => {
              const confirmed = window.confirm(
                "Send this quotation to the tourist? Once sent, this draft can no longer be edited.",
              );

              if (confirmed) {
                sendMutation.mutate();
              }
            }}
          >
            {sendMutation.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}

            {sendMutation.isPending ? "Sending..." : "Send quotation"}
          </Button>

          {sendMutation.isError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <p className="text-sm text-destructive">
                {getErrorMessage(sendMutation.error)}
              </p>
            </div>
          )}
        </div>
      )}

      {!isDraft && (
        <p className="border-t pt-4 text-sm leading-6 text-muted-foreground">
          This quotation is no longer editable because its status is{" "}
          <span className="font-medium text-foreground">
            {formatStatus(quotation.status)}
          </span>
          .
        </p>
      )}
    </div>
  );
}