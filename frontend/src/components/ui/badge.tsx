import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * Travora badge (CR-028). Tone variants are used by StatusBadge;
 * a tone must always be paired with a text label (and ideally an
 * icon) -- never color alone.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&>svg]:pointer-events-none [&>svg]:size-3.5!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-tea-800",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-tea-100",
        destructive:
          "bg-danger-soft text-danger-ink [a]:hover:bg-danger-border/60",
        outline:
          "border-border text-foreground [a]:hover:bg-muted",
        ghost:
          "hover:bg-muted hover:text-foreground",
        link: "text-tea-700 underline-offset-4 hover:underline",
        neutral: "border-ink-200 bg-ink-50 text-ink-700",
        info: "border-info-border bg-info-soft text-info-ink",
        awaiting: "border-cinnamon-200 bg-cinnamon-50 text-cinnamon-800",
        success: "border-success-border bg-success-soft text-success-ink",
        warning: "border-warning-border bg-warning-soft text-warning-ink",
        danger: "border-danger-border bg-danger-soft text-danger-ink",
        muted: "border-sand-300 bg-sand-100 text-sand-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
