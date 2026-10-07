"use client";

import {
  useState,
} from "react";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  X,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

import {
  Label,
} from "@/components/ui/label";

import {
  Textarea,
} from "@/components/ui/textarea";

import {
  rejectQuotation,
} from "@/features/quotations/quotation.api";

interface RejectQuotationDialogProps {
  quotationId: string;
  tourRequestId: string;
}

export function RejectQuotationDialog({
  quotationId,
  tourRequestId,
}: RejectQuotationDialogProps) {
  const queryClient =
    useQueryClient();

  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    reason,
    setReason,
  ] = useState("");

  const mutation =
    useMutation({
      mutationFn: () =>
        rejectQuotation(
          quotationId,
          reason
        ),

      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: [
            "quotation",
            quotationId,
          ],
        });

        await queryClient.invalidateQueries({
          queryKey: [
            "tour-request",
            tourRequestId,
            "quotations",
          ],
        });

        await queryClient.invalidateQueries({
          queryKey: [
            "tour-request",
            tourRequestId,
          ],
        });

        await queryClient.invalidateQueries({
          queryKey: [
            "tour-requests",
            "me",
          ],
        });

        setReason("");
        setIsOpen(false);
      },
    });

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        className="w-full"
        disabled={
          mutation.isPending
        }
        onClick={() =>
          setIsOpen(true)
        }
      >
        <X className="size-4" />

        Reject quotation
      </Button>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div>
        <h3 className="font-semibold">
          Reject quotation
        </h3>

        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          You may provide a reason so the travel agency understands what should
          be changed.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quotation-rejection-reason">
          Reason
        </Label>

        <Textarea
          id="quotation-rejection-reason"
          rows={4}
          maxLength={1000}
          placeholder="Example: The total price is above my budget."
          value={reason}
          onChange={(event) =>
            setReason(
              event.target.value
            )
          }
        />

        <p className="text-xs text-muted-foreground">
          {reason.length}/1000
        </p>
      </div>

      {mutation.isError && (
        <p className="text-sm text-destructive">
          Unable to reject the quotation. Please try again.
        </p>
      )}

      <div className="flex gap-3">
        <Button
          variant="destructive"
          className="flex-1"
          disabled={
            mutation.isPending
          }
          onClick={() =>
            mutation.mutate()
          }
        >
          {mutation.isPending
            ? "Rejecting..."
            : "Confirm rejection"}
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={
            mutation.isPending
          }
          onClick={() => {
            setReason("");
            setIsOpen(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}