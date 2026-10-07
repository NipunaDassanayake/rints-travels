import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full px-3 py-2 rounded-md border border-input bg-card text-base text-foreground shadow-xs transition-[color,border-color,box-shadow] duration-fast outline-none placeholder:text-subtle-foreground hover:border-ink-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-solid focus-visible:outline-ring disabled:cursor-not-allowed disabled:border-sand-300 disabled:bg-sand-100 disabled:text-subtle-foreground [&[readonly]]:bg-sand-50 aria-invalid:border-destructive aria-invalid:hover:border-destructive md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
