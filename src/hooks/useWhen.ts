"use client";

import { useSyncExternalStore } from "react";
import { formatDate, formatRelativeTime } from "@/lib/format";

const subscribe = () => () => {};

/**
 * A timestamp as the viewer's local date ("text"), with the full local date and
 * time and then how long ago, in parentheses, for a hover ("hover"). The server
 * has neither the viewer's time zone nor locale, so it renders the UTC form and
 * the browser swaps in the local one right after hydrating, without a hydration
 * mismatch.
 */
export function useWhen(iso: string) {
  const inBrowser = useSyncExternalStore(subscribe, () => true, () => false);
  if (!inBrowser) return { text: formatDate(iso), hover: formatDate(iso, true) };
  const date = new Date(iso);
  return {
    text: date.toLocaleDateString(undefined, { dateStyle: "medium" }),
    hover: `${date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "long",
    })} (${formatRelativeTime(iso)})`,
  };
}
