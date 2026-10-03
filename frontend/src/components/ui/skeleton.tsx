import { cn } from "@/lib/utils"

/*
 * Placeholder block shown while content loads. Decorative only:
 * pair it with an accessible loading announcement (LoadingState
 * or aria-busy on the region). The pulse stops under
 * prefers-reduced-motion.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-sand-200", className)}
      {...props}
    />
  )
}

export { Skeleton }
