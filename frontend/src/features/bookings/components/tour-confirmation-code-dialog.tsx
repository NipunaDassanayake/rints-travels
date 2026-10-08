"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { CheckCircle2, LoaderCircle, Play, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { generateLifecycleConfirmationCode } from "../booking.api";

import type { Booking, BookingLifecycleAction, BookingStatus } from "../booking.types";

/*
 * Traveler side of the CR-032 two-party confirmation. The traveler
 * generates a short-lived code and hands it to their assigned guide,
 * who enters it to start or complete the tour.
 *
 * The plaintext code exists only in this component's state: it is
 * never cached, stored or put in a URL, and it cannot be fetched
 * again -- closing the dialog discards it. The backend decides
 * whether a code is valid; the countdown here is guidance only.
 */

const POLL_INTERVAL_MS = 5_000;

export const LIFECYCLE_CONFIRMATION: Record<
  BookingLifecycleAction,
  {
    from: BookingStatus;
    trigger: string;
    title: string;
    description: string;
    explanation: (guideName: string) => string;
    codeLabel: string;
  }
> = {
  START: {
    from: "CONFIRMED",
    trigger: "Confirm tour start",
    title: "Confirm tour start",
    description: "Only generate this code when your assigned guide is with you.",
    explanation: (guideName) =>
      `${guideName} enters this code to start your tour. Each code works once and expires after a few minutes.`,
    codeLabel: "Start tour code",
  },
  COMPLETE: {
    from: "IN_PROGRESS",
    trigger: "Confirm tour completion",
    title: "Confirm tour completion",
    description: "This code lets your assigned guide mark the tour as complete.",
    explanation: (guideName) =>
      `Generate it only when your tour has actually finished. Once ${guideName} confirms completion, you can review your trip and your guide. Each code works once and expires after a few minutes.`,
    codeLabel: "Completion code",
  },
};

/** Spoken at meaningful moments only -- never every second. */
const COUNTDOWN_ANNOUNCEMENTS = {
  minute: "1 minute remaining.",
  half: "30 seconds remaining.",
  expired: "This code has expired.",
} as const;

type CountdownMarker = keyof typeof COUNTDOWN_ANNOUNCEMENTS;

interface DisplayedCode {
  code: string;
  expiresAtMs: number;
  /** Server clock minus client clock when the code arrived. */
  skewMs: number;
  guideName: string;
  /** The guide assigned when the code was generated. */
  guideId: string | null;
}

function guideNameOf(booking: Booking) {
  const guide = booking.quotation?.guide;

  return guide ? `${guide.user.firstName} ${guide.user.lastName}` : null;
}

/** Read only in effects and event handlers, never during render. */
const clientNow = () => Date.now();

function remainingMs(displayed: DisplayedCode, now: number) {
  return displayed.expiresAtMs - (now + displayed.skewMs);
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));

  const minutes = Math.floor(totalSeconds / 60);

  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function countdownMarker(ms: number): CountdownMarker | null {
  if (ms <= 0) return "expired";

  if (ms <= 30_000) return "half";

  if (ms <= 60_000) return "minute";

  return null;
}

type ApiError = {
  response?: {
    status?: number;
    data?: {
      errors?: { code?: string } | string[] | null;
    };
  };
};

function describeGenerateError(error: unknown) {
  const response =
    typeof error === "object" && error !== null && "response" in error
      ? (error as ApiError).response
      : undefined;

  const errors = response?.data?.errors;

  const code = errors && !Array.isArray(errors) ? errors.code : undefined;

  if (!response) {
    return {
      message: "We couldn't reach Travora. Check your connection and try again.",
      refresh: false,
    };
  }

  if (code === "BOOKING_STATUS_MISMATCH") {
    return { message: "This booking has changed. Showing its current status.", refresh: true };
  }

  if (code === "NO_ASSIGNED_GUIDE") {
    return { message: "A guide hasn't been assigned to this booking yet.", refresh: true };
  }

  if (response.status === 403) {
    return { message: "You can't confirm this booking from this account.", refresh: false };
  }

  if (response.status === 404) {
    return { message: "This booking could not be found.", refresh: true };
  }

  if (response.status === 429) {
    return {
      message: "Several codes were generated for this booking in a short time. Please wait a few minutes and try again.",
      refresh: false,
    };
  }

  return { message: "We couldn't create a code. Please try again.", refresh: false };
}

type TourConfirmationCodeDialogProps = {
  booking: Booking;

  /** The confirmation in progress; null when the dialog is closed. */
  action: BookingLifecycleAction | null;

  onOpenChange: (open: boolean) => void;

  /** Refetches the booking (the page re-renders with the result). */
  refreshBooking: () => Promise<unknown>;

  /** The booking left the state this dialog confirms. */
  onBookingChanged: (status: BookingStatus) => void;

  /** Receives focus when the dialog closes because the booking changed. */
  changeFocusRef: RefObject<HTMLElement | null>;
};

export function TourConfirmationCodeDialog({
  booking,
  action,
  onOpenChange,
  refreshBooking,
  onBookingChanged,
  changeFocusRef,
}: TourConfirmationCodeDialogProps) {
  const changedRef = useRef(false);

  // Opening lands on the primary action, not on Close.
  const generateRef = useRef<HTMLButtonElement>(null);

  // The guide started/completed the tour, or the booking changed in
  // another way (e.g. cancelled): the dialog's purpose is over.
  useEffect(() => {
    if (!action) {
      return;
    }

    if (booking.status === LIFECYCLE_CONFIRMATION[action].from) {
      changedRef.current = false;

      return;
    }

    changedRef.current = true;

    onBookingChanged(booking.status);
  }, [action, booking.status, onBookingChanged]);

  return (
    <Dialog open={action !== null} onOpenChange={onOpenChange}>
      {/* The footer has the one Close button; no second, icon-only one. */}
      <DialogContent
        showCloseButton={false}
        initialFocus={generateRef}
        finalFocus={() => (changedRef.current ? (changeFocusRef.current ?? true) : true)}
      >
        {action && (
          <ConfirmationCodePanel
            key={action}
            booking={booking}
            action={action}
            refreshBooking={refreshBooking}
            onClose={() => onOpenChange(false)}
            generateRef={generateRef}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type ConfirmationCodePanelProps = {
  booking: Booking;

  action: BookingLifecycleAction;

  refreshBooking: () => Promise<unknown>;

  onClose: () => void;

  generateRef: RefObject<HTMLButtonElement | null>;
};

function ConfirmationCodePanel({
  booking,
  action,
  refreshBooking,
  onClose,
  generateRef,
}: ConfirmationCodePanelProps) {
  const config = LIFECYCLE_CONFIRMATION[action];

  const [displayed, setDisplayed] = useState<DisplayedCode | null>(null);

  const [now, setNow] = useState(() => Date.now());

  const [pending, setPending] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [announcement, setAnnouncement] = useState("");

  const pendingRef = useRef(false);

  const announcedRef = useRef(new Set<CountdownMarker>());

  const codeRef = useRef<HTMLDivElement>(null);

  const currentGuideId = booking.quotation?.guide?.id ?? null;

  const currentGuideName = guideNameOf(booking);

  // A code generated for a guide who is no longer assigned is
  // useless (the backend invalidated it): never keep showing it.
  const guideChanged = displayed !== null && displayed.guideId !== currentGuideId;

  const remaining = displayed ? remainingMs(displayed, now) : 0;

  const expired = displayed !== null && !guideChanged && remaining <= 0;

  const showCode = displayed !== null && !guideChanged && !expired;

  // Countdown: one tick a second, spoken only at the markers.
  useEffect(() => {
    if (!displayed) {
      return;
    }

    const timer = setInterval(() => {
      const current = Date.now();

      setNow(current);

      const left = remainingMs(displayed, current);

      const marker = countdownMarker(left);

      if (marker && !announcedRef.current.has(marker)) {
        announcedRef.current.add(marker);

        setAnnouncement(COUNTDOWN_ANNOUNCEMENTS[marker]);
      }

      if (left <= 0) {
        clearInterval(timer);
      }
    }, 1_000);

    return () => clearInterval(timer);
  }, [displayed]);

  // While a usable code is shown, watch for the guide redeeming it.
  // Sequential (never overlapping) and stopped on close, unmount,
  // expiry or any change of state.
  useEffect(() => {
    if (!showCode) {
      return;
    }

    let cancelled = false;

    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        await refreshBooking();
      } catch {
        // The next poll tries again; the page shows load errors.
      }

      if (!cancelled) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    timer = setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;

      clearTimeout(timer);
    };
  }, [showCode, refreshBooking]);

  const generate = async () => {
    if (pendingRef.current) {
      return;
    }

    pendingRef.current = true;

    setPending(true);

    setError(null);

    const guideIdAtRequest = currentGuideId;

    try {
      const result = await generateLifecycleConfirmationCode(booking.id, action);

      const receivedAt = clientNow();

      const serverNow = result.serverTime ? Date.parse(result.serverTime) : Number.NaN;

      announcedRef.current = new Set();

      setNow(receivedAt);

      setDisplayed({
        code: result.code,
        expiresAtMs: Date.parse(result.expiresAt),
        skewMs: Number.isFinite(serverNow) ? serverNow - receivedAt : 0,
        guideName: result.guide
          ? `${result.guide.firstName} ${result.guide.lastName}`
          : (currentGuideName ?? "your guide"),
        guideId: guideIdAtRequest,
      });

      setAnnouncement(`${config.codeLabel} ready.`);

      requestAnimationFrame(() => codeRef.current?.focus());
    } catch (generateError) {
      const described = describeGenerateError(generateError);

      setError(described.message);

      if (described.refresh) {
        void refreshBooking().catch(() => undefined);
      }
    } finally {
      pendingRef.current = false;

      setPending(false);
    }
  };

  const guideName = displayed?.guideName ?? currentGuideName ?? "your guide";

  const digits = displayed?.code ?? "";

  return (
    <div className="grid min-w-0 gap-4">
      <DialogHeader>
        <DialogTitle>{config.title}</DialogTitle>

        <DialogDescription>{config.description}</DialogDescription>
      </DialogHeader>

      {showCode ? (
        <div
          ref={codeRef}
          tabIndex={-1}
          aria-busy={pending}
          data-testid="confirmation-code-panel"
          className="grid gap-2 rounded-lg border border-tea-200 bg-tea-50 p-4 text-center outline-none focus-visible:outline-2 focus-visible:outline-ring"
        >
          <p className="text-overline text-tea-700">{config.codeLabel}</p>

          <p className={pending ? "opacity-40" : undefined}>
            <span
              aria-hidden="true"
              data-testid="confirmation-code"
              className="font-mono text-4xl font-semibold tracking-[0.15em] text-foreground"
            >
              {`${digits.slice(0, 3)} ${digits.slice(3)}`}
            </span>

            <span className="sr-only">{digits.split("").join(" ")}</span>
          </p>

          <p className="text-body-sm text-foreground">Give this code to {guideName}.</p>

          <p data-testid="confirmation-code-expiry" className="text-body-sm text-foreground-secondary">
            {pending ? "Generating a new code…" : `Expires in ${formatRemaining(remaining)}`}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 text-body-sm text-foreground-secondary">
          {guideChanged && (
            <p className="rounded-lg border border-sand-300 bg-sand-50 p-3 text-foreground">
              {currentGuideName
                ? `Your assigned guide has changed to ${currentGuideName}. Generate a new code for them.`
                : "A guide is no longer assigned to this booking."}
            </p>
          )}

          {expired && (
            <p data-testid="confirmation-code-expired" className="rounded-lg border border-sand-300 bg-sand-50 p-3 font-medium text-foreground">
              This code has expired.
            </p>
          )}

          {!displayed && currentGuideName && <p>{config.explanation(currentGuideName)}</p>}

          {!displayed && (
            <p>For your security, a code can&apos;t be shown again once you close this window. You can always generate a new one.</p>
          )}
        </div>
      )}

      <div role="alert" aria-live="assertive">
        {error && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-body-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <DialogFooter className="mt-0">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>

        {currentGuideName && (
          <Button
            ref={generateRef}
            type="button"
            variant={showCode ? "outline" : "default"}
            disabled={pending}
            focusableWhenDisabled
            onClick={() => void generate()}
          >
            {pending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Generating…
              </>
            ) : displayed ? (
              <>
                <RefreshCw className="size-4" aria-hidden="true" />
                Generate new code
              </>
            ) : (
              <>
                {action === "START" ? (
                  <Play className="size-4" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                )}
                Generate code
              </>
            )}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
