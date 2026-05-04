import { useEffect } from "react";

/**
 * Hook to warn users before leaving the page
 *
 * @param shouldWarn - Whether to show the warning
 * @param message - Optional custom message (note: most browsers ignore this and show their own message)
 *
 * @example
 * // Warn when form has unsaved changes
 * useBeforeUnload(hasUnsavedChanges, "You have unsaved changes");
 *
 * // Warn when uploads are in progress
 * useBeforeUnload(hasActiveUploads, "Uploads in progress will be lost");
 */
export function useBeforeUnload(shouldWarn: boolean, message?: string) {
  useEffect(() => {
    if (!shouldWarn) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
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
