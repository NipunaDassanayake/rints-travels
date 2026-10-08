"use client";

import { useId, useRef, useState, type FormEvent, type RefObject } from "react";

import { useMutation } from "@tanstack/react-query";

import { CheckCircle2, LoaderCircle, Play } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { completeGuideTour, startGuideTour } from "../guide-booking.api";

import type { BookingStatus } from "../booking.types";

/*
 * Guide side of the CR-032 two-party confirmation: the traveler
 * generates a short-lived code on their own device and the guide
 * enters it here. The backend checks the code, the assignment and
 * the booking state; this dialog only explains the outcome.
 */

export type GuideTourAction = "START" | "COMPLETE";

const TARGET_STATUS: Record<GuideTourAction, BookingStatus> = {
  START: "IN_PROGRESS",
  COMPLETE: "COMPLETED",
};

const COPY: Record<
  GuideTourAction,
  { title: string; description: string; submit: string; pending: string }
> = {
  START: {
    title: "Start tour",
    description:
      "Ask the traveler to open this booking and choose “Confirm tour start”. Enter the 6-digit code they show you.",
    submit: "Start tour",
    pending: "Starting tour...",
  },
  COMPLETE: {
    title: "Complete tour",
    description:
      "Ask the traveler to open this booking and choose “Confirm tour completion”. Enter the 6-digit code they show you.",
    submit: "Complete tour",
    pending: "Completing tour...",
  },
};

const CODE_LENGTH = 6;

type ApiErrorBody = {
  message?: string;
  errors?: {
    code?: string;
    currentStatus?: BookingStatus;
    attemptsRemaining?: number;
  } | null;
};

type ApiError = {
  response?: {
    status?: number;
    data?: ApiErrorBody;
  };
};

function readApiError(error: unknown) {
  const response =
    typeof error === "object" && error !== null && "response" in error
      ? (error as ApiError).response
      : undefined;

  const errors =
    response?.data?.errors && !Array.isArray(response.data.errors)
      ? response.data.errors
      : null;

  return {
    hasResponse: Boolean(response),
    status: response?.status,
    code: errors?.code,
    currentStatus: errors?.currentStatus,
    attemptsRemaining: errors?.attemptsRemaining,
    message: response?.data?.message,
  };
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function describeError(error: unknown): string {
  const apiError = readApiError(error);

  if (!apiError.hasResponse) {
    return "We couldn't reach Travora. Check your connection and try again.";
  }

  switch (apiError.code) {
    case "CODE_INCORRECT": {
      const remaining = apiError.attemptsRemaining ?? 0;

      return `That code is incorrect. ${remaining} ${
        remaining === 1 ? "attempt" : "attempts"
      } remaining before the traveler needs a new code.`;
    }

    case "CODE_EXPIRED":
      return "This code has expired. Ask the traveler to generate a new code.";

    case "TOO_MANY_ATTEMPTS":
      return "Too many incorrect attempts for this code. Ask the traveler to generate a new code.";

    case "NO_ACTIVE_CODE":
      return "There is no active code for this tour. Ask the traveler to generate one from their booking.";

    case "CONFIRMATION_INTEGRITY_ERROR":
      return "This code can't be checked right now. Ask the traveler to generate a new code.";

    case "NOT_ASSIGNED_GUIDE":
      return "You're no longer assigned to this booking.";

    case "BOOKING_STATUS_MISMATCH":
      return apiError.currentStatus
        ? `This booking is now ${formatStatus(apiError.currentStatus)}, so this action is no longer available.`
        : "This booking has changed, so this action is no longer available.";

    default:
      break;
  }

  if (apiError.status === 429) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }

  if (apiError.status === 400) {
    return "Enter the 6-digit confirmation code.";
  }

  return apiError.message ?? "Something went wrong. Please try again.";
}

type GuideTourConfirmationDialogProps = {
  bookingId: string;

  action: GuideTourAction | null;

  onOpenChange: (open: boolean) => void;

  /** Refreshes the booking and returns its current status. */
  refreshStatus: () => Promise<BookingStatus | undefined>;

  /** Called once the booking has reached the target status. */
  onConfirmed: (action: GuideTourAction) => Promise<void> | void;

  /** Receives focus after a successful confirmation. */
  successFocusRef: RefObject<HTMLElement | null>;
};

export function GuideTourConfirmationDialog({
  bookingId,
  action,
  onOpenChange,
  refreshStatus,
  onConfirmed,
  successFocusRef,
}: GuideTourConfirmationDialogProps) {
  const succeededRef = useRef(false);

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog
      open={action !== null}
      onOpenChange={(open) => {
        if (open) {
          succeededRef.current = false;
        }

        onOpenChange(open);
      }}
    >
      <DialogContent
        initialFocus={inputRef}
        finalFocus={() =>
          succeededRef.current ? (successFocusRef.current ?? true) : true
        }
      >
        {action && (
          <GuideTourCodeForm
            key={action}
            bookingId={bookingId}
            action={action}
            inputRef={inputRef}
            refreshStatus={refreshStatus}
            onSucceeded={async () => {
              succeededRef.current = true;

              await onConfirmed(action);

              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type GuideTourCodeFormProps = {
  bookingId: string;

  action: GuideTourAction;

  inputRef: RefObject<HTMLInputElement | null>;

  refreshStatus: () => Promise<BookingStatus | undefined>;

  onSucceeded: () => Promise<void>;

  onCancel: () => void;
};

function GuideTourCodeForm({
  bookingId,
  action,
  inputRef,
  refreshStatus,
  onSucceeded,
  onCancel,
}: GuideTourCodeFormProps) {
  const inputId = useId();

  const hintId = useId();

  const errorId = useId();

  const [code, setCode] = useState("");

  const [error, setError] = useState<string | null>(null);

  const copy = COPY[action];

  const mutation = useMutation({
    // The variables are the traveler's plaintext code: drop the
    // mutation from TanStack's cache as soon as this dialog unmounts.
    gcTime: 0,

    mutationFn: (value: string) =>
      action === "START"
        ? startGuideTour(bookingId, value)
        : completeGuideTour(bookingId, value),

    onSuccess: async () => {
      await onSucceeded();
    },

    onError: async (mutationError) => {
      const apiError = readApiError(mutationError);

      /*
       * The request may have succeeded even though we did not get
       * the response (or a retry found the booking already moved):
       * the booking's current status is the source of truth, and a
       * code is never needed twice for the same transition.
       */
      const mayHaveSucceeded =
        !apiError.hasResponse || apiError.code === "BOOKING_STATUS_MISMATCH";

      if (mayHaveSucceeded) {
        const currentStatus =
          apiError.currentStatus ?? (await refreshStatus().catch(() => undefined));

        if (currentStatus === TARGET_STATUS[action]) {
          await onSucceeded();

          return;
        }
      }

      setError(describeError(mutationError));

      inputRef.current?.select();
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mutation.isPending) {
      return;
    }

    if (code.length !== CODE_LENGTH) {
      setError("Enter the 6-digit confirmation code.");

      inputRef.current?.focus();

      return;
    }

    setError(null);

    mutation.mutate(code);
  };

  const Icon = action === "START" ? Play : CheckCircle2;

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>

        <DialogDescription id={hintId}>{copy.description}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor={inputId}>Confirmation code</Label>

        <Input
          ref={inputRef}
          id={inputId}
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={CODE_LENGTH}
          value={code}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH));

            if (error) {
              setError(null);
            }
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          className="h-12 text-center font-mono text-2xl tracking-[0.4em] md:text-2xl"
        />
      </div>

      <div id={errorId} role="alert" aria-live="assertive">
        {error && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <DialogFooter className="mt-0">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              {copy.pending}
            </>
          ) : (
            <>
              <Icon className="size-4" aria-hidden="true" />
              {copy.submit}
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
