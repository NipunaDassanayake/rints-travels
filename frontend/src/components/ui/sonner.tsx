"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

/*
 * Light theme only: dark mode is not supported (CR-028), so the
 * toaster must not follow the operating system's color scheme.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-success-ink" />
        ),
        info: (
          <InfoIcon className="size-4 text-info-ink" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-warning-ink" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-danger-ink" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-lg)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast shadow-md",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
