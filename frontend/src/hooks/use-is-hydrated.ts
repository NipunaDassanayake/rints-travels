import { useSyncExternalStore } from "react";

/**
 * =========================================================
 * useIsHydrated
 * =========================================================
 *
 * `false` in the server-rendered HTML and until React has
 * hydrated the component on the client, `true` afterwards.
 *
 * Forms that use uncontrolled react-hook-form inputs must stay
 * disabled until hydration: anything typed earlier is wiped when
 * `register()` attaches, and a pre-hydration submit would fall
 * back to a native form submission.
 */

const subscribe = () => () => {};

export function useIsHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
