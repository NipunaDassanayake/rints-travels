"use client";

import { cn } from "@/lib/utils";

/*
 * Horizontal snap row (CR-029). Browsers only scroll a focused
 * element into view when it is fully off-screen, so a peeking
 * next card would stay half-hidden when tabbed to. When keyboard
 * focus moves into an item that is not fully visible, scroll the
 * whole item to its snap point.
 *
 * Deliberately small: no controls, adds no Tab stops, ignores
 * mouse/touch focus, and does nothing when the list is not
 * scrolling horizontally (e.g. a desktop grid). Children stay
 * server rendered.
 */
export function SnapRow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ul
      className={cn(className)}
      onFocus={(event) => {
        const row = event.currentTarget;

        const target = event.target as HTMLElement;

        const item = target.closest("li");

        if (
          !item ||
          !target.matches(":focus-visible") ||
          row.scrollWidth <= row.clientWidth
        ) {
          return;
        }

        const rowBox = row.getBoundingClientRect();

        const itemBox = item.getBoundingClientRect();

        // Already fully visible (within the row and the viewport): leave it alone.
        const visibleLeft = Math.max(rowBox.left, 0);

        const visibleRight = Math.min(rowBox.right, document.documentElement.clientWidth);

        if (itemBox.left >= visibleLeft && itemBox.right <= visibleRight) {
          return;
        }

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        item.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "nearest",
          inline: "start",
        });
      }}
    >
      {children}
    </ul>
  );
}
