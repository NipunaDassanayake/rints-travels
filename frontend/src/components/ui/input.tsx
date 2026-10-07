import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-(--control-md) w-full min-w-0 px-3 py-1 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground disabled:pointer-events-none rounded-md border border-input bg-card text-base text-foreground shadow-xs transition-[color,border-color,box-shadow] duration-fast outline-none placeholder:text-subtle-foreground hover:border-ink-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-solid focus-visible:outline-ring disabled:cursor-not-allowed disabled:border-sand-300 disabled:bg-sand-100 disabled:text-subtle-foreground [&[readonly]]:bg-sand-50 aria-invalid:border-destructive aria-invalid:hover:border-destructive md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
