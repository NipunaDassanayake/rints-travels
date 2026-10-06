import { Label } from "@/components/ui/label";

import { cn } from "@/lib/utils";

/** ARIA wiring a control needs to be tied to its hint and error. */
export interface FieldControlProps {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}

export const fieldHintId = (id: string) => `${id}-hint`;

export const fieldErrorId = (id: string) => `${id}-error`;

/**
 * One labelled form control (CR-030 Stage 3): the label (with an
 * "(optional)" marker where it applies), optional helper text and
 * the field error. The control is rendered by `children`, which
 * receives the id and ARIA attributes so the hint and the error are
 * announced with it (aria-describedby) and an error marks it
 * invalid (aria-invalid).
 */
export function FormField({
  id,
  label,
  optional = false,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  optional?: boolean;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: (control: FieldControlProps) => React.ReactNode;
}) {
  const describedBy = [hint ? fieldHintId(id) : null, error ? fieldErrorId(id) : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </Label>

      {children({
        id,
        ...(error ? { "aria-invalid": true as const } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
      })}

      {hint && (
        <p id={fieldHintId(id)} className="text-caption text-muted-foreground">
          {hint}
        </p>
      )}

      {error && (
        <p id={fieldErrorId(id)} className="text-body-sm font-medium text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}
