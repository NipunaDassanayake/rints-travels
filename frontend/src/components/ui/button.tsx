import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * Travora button (CR-028).
 *
 * Variant names are unchanged from the shadcn baseline so every
 * existing usage keeps working; `accent`, `destructive-solid` and
 * `inverse` are additions. Heights come from the --control-*
 * tokens: the default is 40px (36px inside data-area="admin").
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-fast outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-tea-800 active:bg-tea-900",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-tea-100 hover:text-tea-900 active:bg-tea-200 aria-expanded:bg-tea-100",
        /*
         * outline/ghost set no base text color (as in the shadcn
         * baseline): many call sites append their own text color to
         * buttonVariants() by string concatenation, without
         * tailwind-merge, and must keep winning.
         */
        outline:
          "border-sand-300 bg-card shadow-xs hover:bg-sand-100 hover:text-foreground active:bg-sand-200 aria-expanded:bg-sand-100",
        ghost:
          "hover:bg-sand-100 hover:text-foreground active:bg-sand-200 aria-expanded:bg-sand-100",
        destructive:
          "bg-danger-soft text-danger-ink hover:bg-danger-border/60 active:bg-danger-border",
        "destructive-solid":
          "bg-danger text-danger-foreground hover:bg-danger-ink active:bg-danger-ink",
        accent:
          "bg-cinnamon-400 text-ink-950 hover:bg-cinnamon-300 active:bg-cinnamon-300",
        inverse:
          "bg-ivory text-ink-900 hover:bg-sand-100 active:bg-sand-200",
        link: "text-tea-700 underline-offset-4 hover:text-tea-800 hover:underline",
      },
      size: {
        xs: "h-(--control-xs) gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-(--control-sm) gap-1.5 px-3 text-sm",
        default: "h-(--control-md) px-4 text-sm",
        lg: "h-(--control-lg) px-5 text-base [&_svg:not([class*='size-'])]:size-5",
        xl: "h-(--control-xl) px-6 text-[1.0625rem] [&_svg:not([class*='size-'])]:size-5",
        "icon-xs": "size-(--control-xs) [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-(--control-sm)",
        icon: "size-(--control-md)",
        "icon-lg": "size-(--control-lg) [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
