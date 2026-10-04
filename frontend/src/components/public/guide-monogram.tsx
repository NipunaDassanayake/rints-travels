import { cn } from "@/lib/utils";

/*
 * Guide initials (CR-029). The public guide API has no portrait,
 * so guides are represented by a monogram rather than stock faces.
 * Decorative: the guide's name is always rendered next to it.
 */

const SIZES = {
  md: "size-14 text-heading-sm",
  lg: "size-20 text-heading-lg",
} as const;

export function GuideMonogram({
  firstName,
  lastName,
  size = "md",
  className,
}: {
  firstName: string;
  lastName: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-tea-800 font-display text-ivory ring-4 ring-tea-50",
        SIZES[size],
        className,
      )}
    >
      {`${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()}
    </span>
  );
}
