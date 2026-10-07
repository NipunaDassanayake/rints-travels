import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/*
 * Styled native <select> (CR-028).
 *
 * Deliberately a real <select>: it keeps platform pickers on
 * mobile, works with labels/ids exactly like the raw element,
 * and stays compatible with Playwright's selectOption(). Every
 * prop (id, name, value, onChange, disabled, aria-*) goes to the
 * <select> itself.
 */
function NativeSelect({
  className,
  wrapperClassName,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & {
  wrapperClassName?: string
  size?: "sm" | "default" | "lg"
}) {
  return (
    <div
      data-slot="native-select-wrapper"
      className={cn("relative w-full", wrapperClassName)}
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          "w-full min-w-0 cursor-pointer appearance-none rounded-md border border-input bg-card pr-10 pl-3 text-base text-foreground shadow-xs transition-[color,border-color,box-shadow] duration-fast outline-none hover:border-ink-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-solid focus-visible:outline-ring disabled:cursor-not-allowed disabled:border-sand-300 disabled:bg-sand-100 disabled:text-subtle-foreground aria-invalid:border-destructive md:text-sm",
          "data-[size=sm]:h-(--control-sm) data-[size=default]:h-(--control-md) data-[size=lg]:h-(--control-lg)",
          className
        )}
        {...props}
      />

      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}

export { NativeSelect }
