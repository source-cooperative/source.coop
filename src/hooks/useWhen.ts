"use client";

import { useSyncExternalStore } from "react";
import { formatDate, formatRelativeTime } from "@/lib/format";

const subscribe = () => () => {};

/**
 * A timestamp as the viewer's local date and time ("text"), with how long ago
 * that was for a hover ("hover"). The server has neither the viewer's time
 * zone nor locale, so it renders the UTC form and the browser swaps in the
 * local one right after hydrating, without a hydration mismatch.
 */
export function useWhen(iso: string) {
  const inBrowser = useSyncExternalStore(subscribe, () => true, () => false);
  if (!inBrowser) {
    const utc = formatDate(iso, true);
    return { text: utc, hover: utc };
  }
  return {
    text: new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    hover: formatRelativeTime(iso),
  };
}
