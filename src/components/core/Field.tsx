"use client";

import { useId } from "react";
import { Flex, Text } from "@radix-ui/themes";

export interface FieldProps {
  /** Visible label. Omit only for a control that labels itself (a checkbox group uses `legend`). */
  label?: React.ReactNode;
  /**
   * `id` of the control this labels. Defaults to a generated id, which `Field`
   * passes to a single child element via `render`.
   */
  htmlFor?: string;
  required?: boolean;
  /** Guidance shown between the label and the control. */
  help?: React.ReactNode;
  /** Server-side validation errors for this field. */
  errors?: string[];
  /**
   * Character count, for controls with a real enforced maximum. Caller-driven:
   * Field wraps the control rather than owning it, so it cannot read the value
   * itself and will render whatever number it is handed. `DynamicForm` computes
   * this for any field declaring `maxLength`; drive it from state when using
   * Field directly, or the count will not move as the user types.
   */
  counter?: { value: number; max: number };
  /** Rendered on the label row, opposite the label (e.g. "Managed elsewhere"). */
  aside?: React.ReactNode;
  /**
   * For a set of controls rather than one — a checkbox group, radio cards, or a
   * read-only display. There is no single control to point a `<label>` at, so
   * the label becomes the group's accessible name instead.
   */
  group?: boolean;
  /**
   * Renders the control. Prefer the FUNCTION form: it receives the ids to wire
   * up, and spreading them onto the control is what associates the label, help
   * text and errors with it. A plain element is only correct alongside `group`,
   * or when you pass `htmlFor` and set that id on the control yourself.
   */
  children:
    | React.ReactNode
    | ((props: {
        id: string;
        "aria-describedby"?: string;
        "aria-invalid"?: boolean;
        /** Set only with `group`: the label is not a <label>, so name by id. */
        "aria-labelledby"?: string;
      }) => React.ReactNode);
}

/**
 * The one field anatomy: label, help, control, error.
 *
 * Everything a field needs to be announced correctly — the generated id, the
 * label association, `aria-describedby` covering both the help text and any
 * errors, `aria-invalid` — is wired here so no caller has to remember it. The
 * control is a child rather than a `type` union, which is what lets the same
 * component wrap a text input, a select, a checkbox group or a dropzone.
 */
export function Field({
  label,
  htmlFor,
  required,
  help,
  errors,
  counter,
  aside,
  group,
  children,
}: FieldProps) {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;
  const labelId = `${id}-label`;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = errors?.length ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  const labelContent = label && (
    <>
      {label}
      {required && (
        <>
          {" "}
          <Text color="red" aria-hidden="true">
            *
          </Text>
          <span className="sr-only"> (required)</span>
        </>
      )}
    </>
  );

  return (
    <Flex direction="column" gap="1">
      {(label || aside || counter) && (
        <Flex align="baseline" justify="between" gap="3">
          {label &&
            (group ? (
              // No single control owns this, so the label names the group via
              // aria-labelledby rather than pointing htmlFor at nothing.
              <Text as="div" id={labelId} size="2" weight="medium">
                {labelContent}
              </Text>
            ) : (
              <Text as="label" size="2" weight="medium" htmlFor={id}>
                {labelContent}
              </Text>
            ))}
          {counter && (
            <Text
              size="1"
              color={counter.value > counter.max ? "red" : "gray"}
              style={{ fontFamily: "var(--code-font-family)" }}
            >
              {counter.value} / {counter.max}
            </Text>
          )}
          {aside}
        </Flex>
      )}

      {help && (
        <Text size="1" color="gray" id={helpId}>
          {help}
        </Text>
      )}

      {typeof children === "function" ? (
        children({
          id,
          "aria-describedby": describedBy,
          "aria-invalid": errors?.length ? true : undefined,
          // With `group` the label is a <div>, not a <label>, so htmlFor buys
          // nothing — the control has to name itself by pointing at it.
          ...(group && label ? { "aria-labelledby": labelId } : {}),
        })
      ) : group ? (
        <div
          role="group"
          aria-labelledby={label ? labelId : undefined}
          aria-describedby={describedBy}
        >
          {children}
        </div>
      ) : (
        children
      )}

      {/* One container carries the id, so aria-describedby covers every error.
          Tagging only the first meant a screen reader announced one message and
          silently dropped the rest — and zod's flatten() returns an array per
          field precisely because several checks can fail at once. */}
      {errors?.length ? (
        <Flex direction="column" gap="1" id={errorId}>
          {errors.map((error, index) => (
            <Text size="1" color="red" key={`${id}-${index}`}>
              {error}
            </Text>
          ))}
        </Flex>
      ) : null}
    </Flex>
  );
}
