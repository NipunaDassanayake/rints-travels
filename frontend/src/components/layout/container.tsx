import { cn } from "@/lib/utils";

const WIDTHS = {
  reading: "max-w-reading",
  form: "max-w-form",
  content: "max-w-content",
  wide: "max-w-wide",
  page: "max-w-page",
} as const;

/**
 * Centered page container with the standard side gutters
 * (16px / 24px from sm / 32px from lg).
 */
export function Container({
  width = "wide",
  className,
  ...props
}: React.ComponentProps<"div"> & { width?: keyof typeof WIDTHS }) {
  return (
    <div
      className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", WIDTHS[width], className)}
      {...props}
    />
  );
}
