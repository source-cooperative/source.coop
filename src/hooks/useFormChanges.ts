import { useCallback, useEffect, useRef, useState } from "react";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";

/**
 * Everything the form would submit, comparable across renders. A chosen file
 * stands in as its name and size, since its contents can't be read here; not
 * its modification time, which an empty file input reports as the moment it's
 * asked.
 */
const snapshot = (form: HTMLFormElement) =>
  JSON.stringify(
    [...new FormData(form).entries()].map(([k, v]) => [
      k,
      v instanceof File ? [v.name, v.size] : v,
    ])
  );

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
  // What the form held when last submitted. A save that succeeds saved this,
  // not whatever was typed while it was on its way.
  const submitted = useRef<string | null>(null);
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
    // Some controls finish mounting a render or two late (a Radix Select adds
    // its native <select> once it knows it sits in a form), so until someone
    // touches the form, a change to it is the form settling, not an edit.
    let touched = false;
    const touch = () => (touched = true);
    const check = () => setDirty(isDirty());
    const edit = () => {
      touch();
      check();
    };
    const settle = () => {
      if (!touched) saved.current = snapshot(form);
      check();
    };
    const onSubmit = () => (submitted.current = snapshot(form));
    // Click too: a Radix checkbox or switch sets its hidden input's `checked`,
    // which no attribute reflects, and announces it with a click.
    const listeners: [string, () => void][] = [
      ["pointerdown", touch],
      ["keydown", touch],
      ["input", edit],
      ["change", edit],
      ["click", edit],
      ["submit", onSubmit],
    ];
    for (const [type, fn] of listeners) form.addEventListener(type, fn, true);
    const observer = new MutationObserver(settle);
    // Only the attributes that change what the form submits, so hover and
    // focus states elsewhere in the form don't each re-read it.
    observer.observe(form, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["value", "name", "disabled", "checked"],
    });
    return () => {
      for (const [type, fn] of listeners) form.removeEventListener(type, fn, true);
      observer.disconnect();
    };
  }, [isDirty]);

  useEffect(() => {
    if (!lastSave || !formRef.current) return;
    saved.current = submitted.current ?? snapshot(formRef.current);
    submitted.current = null;
    setDirty(isDirty());
  }, [lastSave, isDirty]);

  useUnsavedChangesWarning(isDirty);
  return { formRef, dirty };
}
