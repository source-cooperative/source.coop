import { useEffect } from "react";

/**
 * Hook to warn users before leaving the page
 *
 * @param shouldWarn - Whether to show the warning, or a function asked at the
 *   moment of leaving, for state that is cheaper to check then than to track
 * @param message - Optional custom message (note: most browsers ignore this and show their own message)
 *
 * @example
 * // Warn when form has unsaved changes
 * useBeforeUnload(hasUnsavedChanges, "You have unsaved changes");
 *
 * // Warn when uploads are in progress
 * useBeforeUnload(hasActiveUploads, "Uploads in progress will be lost");
 */
export function useBeforeUnload(
  shouldWarn: boolean | (() => boolean),
  message?: string
) {
  useEffect(() => {
    if (!shouldWarn) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (typeof shouldWarn === "function" && !shouldWarn()) return;
      // Standard way to trigger the browser's confirmation dialog
      event.preventDefault();

      // For older browsers (Chrome < 51, though most browsers now ignore custom messages)
      if (message) {
        event.returnValue = message;
        return message;
      }

      // Modern browsers show their own message
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldWarn, message]);
}
