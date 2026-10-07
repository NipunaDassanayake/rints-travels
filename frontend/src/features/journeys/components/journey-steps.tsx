import { Check, Circle, CircleDot } from "lucide-react";

import { cn } from "@/lib/utils";

import { JOURNEY_STEPS } from "../journey";

/**
 * The four-step journey tracker (Request, Quotation, Payment,
 * Booking). Step state is conveyed by icon and text, not by color
 * alone; the current step carries aria-current="step".
 */
export function JourneySteps({
  stepIndex,
  className,
}: {
  stepIndex: number;
  className?: string;
}) {
  return (
    <ol aria-label="Trip progress" className={cn("grid grid-cols-4 gap-2", className)}>
      {JOURNEY_STEPS.map((step, index) => {
        const state = index < stepIndex ? "done" : index === stepIndex ? "current" : "todo";

        const Icon = state === "done" ? Check : state === "current" ? CircleDot : Circle;

        return (
          <li
            key={step}
            aria-current={state === "current" ? "step" : undefined}
            className="flex min-w-0 flex-col items-start gap-1.5"
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-1 w-full rounded-full",
                state === "todo" ? "bg-sand-200" : "bg-tea-600",
              )}
            />

            <span
              className={cn(
                "flex items-center gap-1 text-caption",
                state === "todo" ? "text-muted-foreground" : "font-medium text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">{step}</span>
              <span className="sr-only">
                {state === "done" ? " (done)" : state === "current" ? " (current step)" : " (not started)"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
