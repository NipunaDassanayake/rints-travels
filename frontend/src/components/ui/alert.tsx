import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

/*
 * Inline feedback callout (CR-028). Tone is always reinforced by
 * an icon and text. Errors use role="alert" (announced
 * immediately); other tones use role="status".
 */
const alertVariants = cva(
  "relative grid w-full grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1 rounded-lg border px-4 py-3 text-sm",
  {
    variants: {
      tone: {
        info: "border-info-border bg-info-soft text-info-ink",
        success: "border-success-border bg-success-soft text-success-ink",
        warning: "border-warning-border bg-warning-soft text-warning-ink",
        danger: "border-danger-border bg-danger-soft text-danger-ink",
        neutral: "border-border bg-muted text-foreground",
      },
    },
    defaultVariants: {
      tone: "info",
    },
  }
)

const TONE_ICONS = {
  info: InfoIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
  danger: CircleAlertIcon,
  neutral: InfoIcon,
} as const

function Alert({
  className,
  tone = "info",
  title,
  children,
  icon,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof alertVariants> & {
    title?: React.ReactNode
    icon?: React.ReactNode
  }) {
  const Icon = TONE_ICONS[tone ?? "info"]

  return (
    <div
      data-slot="alert"
      role={tone === "danger" ? "alert" : "status"}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      <span className="mt-0.5 [&_svg]:size-4" aria-hidden="true">
        {icon ?? <Icon />}
      </span>

      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}

        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  )
}

export { Alert, alertVariants }
