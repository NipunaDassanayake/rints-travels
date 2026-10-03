import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/*
 * Travora typography utilities (globals.css `@utility text-*`).
 * Registered as font-size classes so tailwind-merge does not
 * mistake them for text colors and drop either the type style or
 * the color when both are combined, e.g.
 * cn("text-body-sm", "text-foreground").
 */
export const TYPOGRAPHY_SIZES = [
  "display-2xl",
  "display-xl",
  "display-lg",
  "display-md",
  "heading-xl",
  "heading-lg",
  "heading-md",
  "heading-sm",
  "body-lg",
  "body",
  "body-sm",
  "label",
  "caption",
  "overline",
  "stat",
] as const

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...TYPOGRAPHY_SIZES] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
