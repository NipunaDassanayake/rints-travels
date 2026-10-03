import { LoaderCircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/*
 * Loading spinner. Purely visual unless `label` is given, in
 * which case it is announced politely to screen readers.
 */
function Spinner({
  className,
  label,
  size = "default",
}: {
  className?: string
  label?: string
  size?: "sm" | "default" | "lg"
}) {
  const icon = (
    <LoaderCircleIcon
      aria-hidden="true"
      data-slot="spinner"
      className={cn(
        "animate-spin text-muted-foreground",
        size === "sm" && "size-4",
        size === "default" && "size-5",
        size === "lg" && "size-7",
        className
      )}
    />
  )

  if (!label) {
    return icon
  }

  return (
    <span role="status" className="inline-flex items-center gap-2">
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  )
}

export { Spinner }
