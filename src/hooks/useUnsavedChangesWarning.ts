import { useEffect } from "react";
import { useBeforeUnload } from "./useBeforeUnload";

const MESSAGE = "You have unsaved changes. Leave this page and lose them?";

/** Clicks already asked about, so one click never asks twice. */
const asked = new WeakSet<Event>();

/**
 * Asks before someone leaves a page holding unsaved changes, whichever way
 * they leave. Closing the tab, reloading or typing an address unload the page,
 * and the browser asks. A link within the app doesn't: Next.js swaps the page
 * in place, so this asks on the click, and a "Cancel" stops it before the
 * link's own handler runs. The browser's Back button isn't caught.
 *
 * @param isDirty - Asked at the moment of leaving, so a form can compare what
 *   it would submit with what it loaded rather than track every edit.
 */
export function useUnsavedChangesWarning(isDirty: () => boolean) {
  useBeforeUnload(isDirty, MESSAGE);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      // Left to the browser: new tabs and windows, downloads, and modified
      // clicks, none of which leave this page.
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.hasAttribute("download") ||
        (link.target && link.target !== "_self")
      ) {
        return;
      }
      const to = new URL(link.href, window.location.href);
      const here = window.location;
      // Another site unloads the page, which beforeunload already covers; a
      // link to a fragment of this page doesn't leave it.
      if (to.origin !== here.origin) return;
      if (to.pathname === here.pathname && to.search === here.search) return;
      if (!isDirty() || asked.has(event)) return;
      // Each dirty form on the page listens; the first to ask answers for
      // all of them, whichever way the person answers.
      asked.add(event);
      if (window.confirm(MESSAGE)) return;
      event.preventDefault();
      // In the capture phase, before React's listener at the root, so
      // next/link never sees the click.
      event.stopPropagation();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isDirty]);
}
