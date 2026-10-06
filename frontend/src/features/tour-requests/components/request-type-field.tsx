import { Map as MapIcon, Sparkles } from "lucide-react";

import type { UseFormRegisterReturn } from "react-hook-form";

import { cn } from "@/lib/utils";

import type { TourRequestType } from "../tour-request.types";

const OPTIONS: {
  value: TourRequestType;
  title: string;
  description: string;
  icon: typeof MapIcon;
}[] = [
  {
    value: "PACKAGE_BASED",
    title: "Customize a package",
    description:
      "Start from an existing Travora journey and personalize the dates, travelers, accommodation, guide and experiences.",
    icon: Sparkles,
  },
  {
    value: "CUSTOM",
    title: "Create from scratch",
    description:
      "Tell us what you have in mind and our team will design a completely custom Sri Lanka journey.",
    icon: MapIcon,
  },
];

/**
 * "How would you like to start?" as a real radio group
 * (CR-030 Stage 3): a fieldset whose legend is the section heading,
 * and large radio cards. Each radio is named by its title and
 * described by its explanation.
 */
export function RequestTypeField({
  value,
  registration,
}: {
  value: TourRequestType;
  registration: UseFormRegisterReturn<"requestType">;
}) {
  return (
    <fieldset>
      <legend className="w-full">
        <h2 className="text-heading-md text-foreground">How would you like to start?</h2>
      </legend>

      <p className="mt-1 text-body-sm text-muted-foreground">
        Customize one of our existing journeys or ask us to design something completely new.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ value: option, title, description, icon: Icon }) => {
          const id = `requestType-${option}`;

          const selected = value === option;

          return (
            <label
              key={option}
              htmlFor={id}
              className={cn(
                "flex cursor-pointer gap-3 rounded-card border bg-card p-4 transition-colors duration-fast has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                selected ? "border-tea-600 bg-tea-50 ring-1 ring-tea-600" : "hover:bg-sand-50",
              )}
            >
              <input
                id={id}
                type="radio"
                value={option}
                aria-labelledby={`${id}-title`}
                aria-describedby={`${id}-description`}
                className="mt-1 size-[18px] shrink-0 accent-tea-700"
                {...registration}
              />

              <span className="min-w-0">
                <span id={`${id}-title`} className="flex items-center gap-2 font-medium text-foreground">
                  <Icon aria-hidden="true" className="size-4 text-tea-700" />
                  {title}
                </span>

                <span id={`${id}-description`} className="mt-1 block text-body-sm text-muted-foreground">
                  {description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
