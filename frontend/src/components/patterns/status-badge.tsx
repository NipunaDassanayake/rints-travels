import {
  BellRingIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  CircleXIcon,
  ClockIcon,
  MessageCircleIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";

import {
  getStatusLabel,
  getStatusTone,
  type StatusEntity,
  type StatusTone,
} from "@/lib/status";

const TONE_ICONS: Record<StatusTone, typeof ClockIcon> = {
  neutral: ClockIcon,
  info: MessageCircleIcon,
  awaiting: BellRingIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
  danger: CircleXIcon,
  muted: CircleMinusIcon,
};

/**
 * Status pill for a domain status (CR-028). Icon + exact label +
 * tone; the label text is identical to today's formatted status.
 */
export function StatusBadge({
  entity,
  status,
  className,
}: {
  entity: StatusEntity;
  status: string;
  className?: string;
}) {
  const tone = getStatusTone(entity, status);

  const Icon = TONE_ICONS[tone];

  return (
    <Badge
      variant={tone}
      data-status={status}
      data-tone={tone}
      className={cn(className)}
    >
      <Icon data-icon="inline-start" aria-hidden="true" />
      {getStatusLabel(status)}
    </Badge>
  );
}
