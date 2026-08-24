"use client";

import React, { useActionState, startTransition } from "react";
import {
  Flex,
  RadioCards,
  Select,
  Switch,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { Field } from "./Field";
import { FormActions } from "./FormActions";
import { SectionHeader } from "./SectionHeader";

/** Controls that render purely from a value prop, so they must be controlled. */
export type ValueDrivenFieldType = "radio-cards" | "switch";

export type StandardFieldType =
  | "text"
  | "textarea"
  | "email"
  | "url"
  | "password"
  | "number"
  | "tel"
  | "select"
  | "custom";

interface BaseFormField<T extends Record<string, any>> {
  label?: string;
  name: keyof T;
  required?: boolean;
  readOnly?: boolean;
  description?: React.ReactNode;
  placeholder?: string;
  isValid?: boolean | null;
  message?: React.ReactNode;
  customComponent?: React.ReactNode; // Custom component for rendering
  options?: FormFieldOption[]; // Options for select and radio-cards fields
  /** Render the value in the code face — for IDs, emails and URLs. */
  mono?: boolean;
  /** Live character count. Only set it where a maximum is actually enforced. */
  maxLength?: number;
  /**
   * Groups the field under a heading. Consecutive fields sharing a section are
   * rendered together beneath one `SectionHeader`.
   */
  section?: string;
  /** Label beside the control, for `switch`. */
  switchLabel?: string;
  /**
   * `switch` only: the switch reads on when the value is "false". For flags
   * stored as the negative of what the user is being asked (`disabled`), so the
   * affirmative reading stays on the left.
   */
  invert?: boolean;
}

/**
 * `radio-cards` and `switch` render entirely from their value prop, so an
 * uncontrolled one would draw a control that never moves when clicked. The
 * type makes that unrepresentable rather than leaving it to be discovered.
 */
interface ValueDrivenFormField<T extends Record<string, any>>
  extends BaseFormField<T> {
  type: ValueDrivenFieldType;
  controlled: true;
  value: string;
  onValueChange: (value: string) => void;
}

interface StandardFormField<T extends Record<string, any>>
  extends BaseFormField<T> {
  type: StandardFieldType;
  controlled?: boolean; // If true, this field will be controlled by the form
  onValueChange?: (value: string) => void; // Callback for controlled fields
  value?: string; // External controlled value
}

export type FormField<T extends Record<string, any>> =
  | ValueDrivenFormField<T>
  | StandardFormField<T>;

export interface FormFieldOption {
  value: string;
  label: string;
  /** Shown under the label. `radio-cards` only — a `select` has no room for it. */
  description?: React.ReactNode;
  disabled?: boolean;
  /** Why the option can't be chosen. Rendered in place of the description. */
  disabledReason?: React.ReactNode;
}

export interface FormState<T> {
  fieldErrors: Record<string, string[]>;
  data: FormData;
  message: string;
  success: boolean;
  // When set on a successful submission, the form navigates here on the client.
  // We navigate client-side (rather than redirect() in the server action) so
  // router.refresh() re-renders the shared layout's auth UI. A server-side
  // redirect() after revalidatePath() does not invalidate the client Router
  // Cache (Next.js issue #49450), leaving the user looking logged out.
  redirectTo?: string;
}

interface DynamicFormProps<T extends Record<string, any>> {
  fields: FormField<T>[];
  action: (
    initialState: any,
    formData: FormData
  ) => Promise<FormState<T>> | FormState<T>;
  submitButtonText?: string;
  hiddenFields?: Record<string, string | undefined>;
  className?: string;
  disabled?: boolean;
  initialValues?: Partial<T>; // Initial values for form fields
  onSuccess?: () => void; // Callback when form submission is successful
  /** Secondary action rendered beside submit (e.g. a dialog's Cancel). */
  secondaryAction?: React.ReactNode;
}

const monoStyle: React.CSSProperties = {
  fontFamily: "var(--code-font-family)",
};

/** Runs of consecutive fields sharing a `section`, in declaration order. */
function groupBySection<T extends Record<string, any>>(fields: FormField<T>[]) {
  const groups: Array<{ key: string; section?: string; fields: FormField<T>[] }> = [];
  for (const field of fields) {
    const last = groups[groups.length - 1];
    if (last && last.section === field.section) {
      last.fields.push(field);
    } else {
      groups.push({
        key: `${field.section ?? ""}-${String(field.name)}`,
        section: field.section,
        fields: [field],
      });
    }
  }
  return groups;
}

export function DynamicForm<T extends Record<string, any>>({
  fields,
  action,
  disabled,
  submitButtonText = "Submit",
  hiddenFields = {},
  className,
  initialValues,
  onSuccess,
  secondaryAction,
}: DynamicFormProps<T>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, {
    message: "",
    data: new FormData(),
    fieldErrors: {},
    success: false,
  });

  const handleControlledChange = (fieldName: string, value: string) => {
    const field = fields.find((f) => String(f.name) === fieldName);
    if (field?.onValueChange) {
      field.onValueChange(value);
    }
  };

  // Value to seed an uncontrolled field with: whatever the last (failed)
  // submission carried, else the caller's initial value.
  // Live lengths for fields with a `maxLength`. Without this the counter reads
  // the seeded value and never moves unless the caller also wires the field up
  // as controlled — a counter that silently depends on unrelated wiring.
  const [liveLengths, setLiveLengths] = React.useState<Record<string, number>>(
    {}
  );
  const trackLength = (field: FormField<T>, value: string) => {
    if (field.maxLength === undefined) return;
    const name = String(field.name);
    setLiveLengths((prev) =>
      prev[name] === value.length ? prev : { ...prev, [name]: value.length }
    );
  };

  const defaultValueFor = (field: FormField<T>) =>
    (state.data.get(String(field.name)) as string) ||
    (initialValues?.[String(field.name)] as string | undefined) ||
    "";

  // Dispatch the action from onSubmit (in a transition) rather than via the
  // form's `action` prop. React automatically resets a form after an `action`
  // submission, and that reset incorrectly snaps controlled <select>/checkbox
  // fields back to their first option/default for a frame before re-applying
  // the controlled value (facebook/react#31695). Dispatching from onSubmit is
  // the React-maintainer-recommended opt-out:
  // https://github.com/facebook/react/issues/29034#issuecomment-2143595195
  // Handling submit ourselves keeps controlled fields' values; `pending` from
  // useActionState still tracks the in-flight action.
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };

  // Call onSuccess when form submission is successful
  React.useEffect(() => {
    if (state.success && onSuccess) {
      onSuccess();
    }
  }, [state.success, onSuccess]);

  // Navigate on the client after a successful submission that asks for it.
  // router.refresh() marks shared layout Router Cache entries as stale so the
  // subsequent router.push() refetches the layout from the server with the
  // current session — a server-side redirect() cannot do this.
  React.useEffect(() => {
    if (state.success && state.redirectTo) {
      router.refresh();
      router.push(state.redirectTo);
    }
  }, [state.success, state.redirectTo, router]);

  const renderControl = (
    field: FormField<T>,
    controlProps: {
      id: string;
      "aria-describedby"?: string;
      "aria-invalid"?: boolean;
    }
  ) => {
    const name = String(field.name);
    const isDisabled = field.readOnly || disabled;

    if (field.type === "custom") {
      // customComponent is a ReactNode, so it can never receive controlProps —
      // which means a <label htmlFor> for it could never resolve. Wrap it so the
      // label and description reach it as a named group instead.
      return field.label ? (
        <div role="group" {...controlProps}>
          {field.customComponent}
        </div>
      ) : (
        field.customComponent
      );
    }

    if (field.type === "textarea") {
      return (
        <TextArea
          {...controlProps}
          name={name}
          size="3"
          rows={4}
          placeholder={field.placeholder}
          required={field.required}
          disabled={isDisabled}
          style={field.mono ? monoStyle : undefined}
          {...(field.controlled
            ? {
                value: field.value ?? "",
                onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  trackLength(field, e.target.value);
                  handleControlledChange(name, e.target.value);
                },
              }
            : {
                defaultValue: defaultValueFor(field),
                onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  trackLength(field, e.target.value),
              })}
        />
      );
    }

    if (field.type === "radio-cards") {
      // Radix RadioCards is not a form control, so the value rides a hidden
      // input. Radio cards are for a handful of options that each need a
      // sentence; anything longer stays a select.
      const value = field.controlled ? field.value ?? "" : defaultValueFor(field);
      return (
        <>
          <input type="hidden" name={name} value={value} />
          <RadioCards.Root
            {...controlProps}
            size="1"
            columns={{ initial: "1", sm: String(field.options?.length ?? 1) }}
            value={value}
            onValueChange={(next: string) => handleControlledChange(name, next)}
            disabled={isDisabled}
          >
            {field.options?.map((option) => (
              <RadioCards.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                <Flex direction="column" align="start" gap="1">
                  <Text size="2" weight="medium">
                    {option.label}
                  </Text>
                  {(option.disabled ? option.disabledReason : option.description) && (
                    <Text size="1" color="gray">
                      {option.disabled ? option.disabledReason : option.description}
                    </Text>
                  )}
                </Flex>
              </RadioCards.Item>
            ))}
          </RadioCards.Root>
        </>
      );
    }

    if (field.type === "switch") {
      const raw = (field.controlled ? field.value : defaultValueFor(field)) === "true";
      const checked = field.invert ? !raw : raw;
      return (
        <>
          <input type="hidden" name={name} value={String(raw)} />
          <Flex align="center" gap="2">
            <Switch
              {...controlProps}
              size="2"
              checked={checked}
              disabled={isDisabled}
              onCheckedChange={(next: boolean) =>
                handleControlledChange(name, String(field.invert ? !next : next))
              }
            />
            {field.switchLabel && <Text size="2">{field.switchLabel}</Text>}
          </Flex>
        </>
      );
    }

    if (field.type === "select") {
      // Radix Select has no concept of an empty option: an unset value is the
      // trigger's placeholder, so only pass a value when there is one.
      const selected = field.controlled
        ? field.value || undefined
        : undefined;
      const initial = field.controlled ? undefined : defaultValueFor(field) || undefined;

      return (
        <Select.Root
          name={name}
          size="3"
          required={field.required}
          disabled={isDisabled}
          {...(field.controlled
            ? {
                value: selected,
                onValueChange: (value: string) =>
                  handleControlledChange(name, value),
              }
            : { defaultValue: initial })}
        >
          <Select.Trigger
            {...controlProps}
            placeholder={field.placeholder}
            style={{ width: "100%" }}
          />
          <Select.Content>
            {field.options?.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      );
    }

    return (
      <TextField.Root
        {...controlProps}
        type={field.type}
        name={name}
        size="3"
        placeholder={field.placeholder}
        required={field.required}
        disabled={isDisabled}
        style={field.mono ? monoStyle : undefined}
        {...(field.controlled
          ? {
              value: field.value ?? "",
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                trackLength(field, e.target.value);
                handleControlledChange(name, e.target.value);
              },
            }
          : {
              defaultValue: defaultValueFor(field),
              onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                trackLength(field, e.target.value),
            })}
      />
    );
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {/* Hidden fields */}
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <Flex direction="column" gap="4">
        {groupBySection(fields).map((group) => {
          const body = group.fields.map((field) => {
            const name = String(field.name);
            const currentValue = field.controlled
              ? field.value
              : defaultValueFor(field);

            return (
              <Field
                key={name}
                label={field.label}
                // Neither of these has a single labelable control to point at:
                // RadioCards.Root is a div[role=radiogroup], and a custom
                // component never receives the id at all.
                group={field.type === "radio-cards" || field.type === "custom"}
                required={field.required}
                help={field.description}
                errors={state.fieldErrors?.[name]}
                counter={
                  field.maxLength
                    ? {
                        value:
                          liveLengths[name] ?? currentValue?.length ?? 0,
                        max: field.maxLength,
                      }
                    : undefined
                }
              >
                {(controlProps) => (
                  <>
                    {renderControl(field, controlProps)}
                    {/* Real-time validation feedback */}
                    {field.message}
                  </>
                )}
              </Field>
            );
          });

          if (!group.section) {
            return (
              <React.Fragment key={group.key}>{body}</React.Fragment>
            );
          }

          return (
            <SectionHeader key={group.key} title={group.section}>
              <Flex direction="column" gap="4">
                {body}
              </Flex>
            </SectionHeader>
          );
        })}

        {!disabled && (
          <FormActions
            submitLabel={submitButtonText}
            pending={pending}
            disabled={fields.some((field) => field.isValid === false)}
            secondary={secondaryAction}
            message={state?.message}
            success={state.success}
          />
        )}
      </Flex>
    </form>
  );
}
