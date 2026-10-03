/**
 * First focusable element on a page: jumps keyboard users past
 * the navigation to the element with id="main-content".
 */
export function SkipLink({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-70"
    >
      Skip to main content
    </a>
  );
}
