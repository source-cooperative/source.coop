import { useCallback, useEffect, useRef, useState } from "react";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";

/** Everything the form would submit, comparable across renders. */
const snapshot = (form: HTMLFormElement) =>
  JSON.stringify([...new FormData(form).entries()].map(([k, v]) => [k, String(v)]));

/**
 * Whether a form holds changes it hasn't saved, kept live for showing so by
 * its Save button, and an ask before anyone leaves while it does (see
 * useUnsavedChangesWarning).
 *
 * Unsaved means different from what the form would have submitted when it
 * loaded or last saved, rather than edited, so typing a value and deleting it
 * again leaves the form unchanged. It is checked on every input and whenever
 * the form's contents change, since controls like the tag picker change
 * hidden inputs, which fire no input events.
 *
 * @param lastSave - Changes with each successful save (an action's state
 *   while it reports success, say), at which point what the form holds
 *   becomes what it saved.
 */
export function useFormChanges(lastSave: unknown) {
  const formRef = useRef<HTMLFormElement>(null);
  const saved = useRef<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const isDirty = useCallback(
    () =>
      !!formRef.current &&
      saved.current !== null &&
      snapshot(formRef.current) !== saved.current,
    []
  );

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    saved.current = snapshot(form);
    const check = () => setDirty(isDirty());
    form.addEventListener("input", check);
    form.addEventListener("change", check);
    const observer = new MutationObserver(check);
    observer.observe(form, { subtree: true, childList: true, attributes: true });
    return () => {
      form.removeEventListener("input", check);
      form.removeEventListener("change", check);
      observer.disconnect();
    };
  }, [isDirty]);

  useEffect(() => {
    if (!lastSave || !formRef.current) return;
    saved.current = snapshot(formRef.current);
    setDirty(false);
  }, [lastSave]);

  useUnsavedChangesWarning(isDirty);
  return { formRef, dirty };
}
