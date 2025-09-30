"use client";

import React, { useActionState } from "react";
import { Button, Text, Flex } from "@radix-ui/themes";
import Form from "next/form";

export interface FormField<T extends Record<string, any>> {
  label: string;
  name: keyof T;
  type:
    | "text"
    | "textarea"
    | "email"
    | "url"
    | "password"
    | "number"
    | "tel"
    | "select"
    | "custom";
  required?: boolean;
  description?: string;
  placeholder?: string;
  isValid?: boolean | null;
  message?: React.ReactNode;
  controlled?: boolean; // If true, this field will be controlled by the form
  onValueChange?: (value: string) => void; // Callback for controlled fields
  value?: string; // External controlled value
  customComponent?: React.ReactNode; // Custom component for rendering
  options?: Array<{ value: string; label: string }>; // Options for select fields
}

export interface FormState<T> {
  fieldErrors: Record<string, string[]>;
  data: FormData;
  message: string;
  success: boolean;
}

interface DynamicFormProps<T extends Record<string, any>> {
  fields: FormField<T>[];
  action: (
    initialState: any,
    formData: FormData
  ) => Promise<FormState<T>> | FormState<T>;
  submitButtonText?: string;
  hiddenFields?: Record<string, string>;
  className?: string;
  disabled?: boolean;
  initialValues?: Partial<T>; // Initial values for form fields
  onSuccess?: () => void; // Callback when form submission is successful
}

const style: React.CSSProperties = {
  fontFamily: "var(--code-font-family)",
  width: "100%",
  padding: "8px 12px",
  borderRadius: "0",
  border: "1px solid var(--gray-6)",
  fontSize: "16px",
  lineHeight: "1.5",
  boxSizing: "border-box",
};

export function DynamicForm<T extends Record<string, any>>({
  fields,
  action,
  submitButtonText = "Submit",
  hiddenFields = {},
  className,
  initialValues,
  onSuccess,
}: DynamicFormProps<T>) {
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

  // Call onSuccess when form submission is successful
  React.useEffect(() => {
    if (state.success && onSuccess) {
      onSuccess();
    }
  }, [state.success, onSuccess]);
  return (
    <Form action={formAction} className={className}>
      {/* Hidden fields */}
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <Flex direction="column" gap="4">
        {fields.map((field) => (
          <div key={String(field.name)}>
            <Flex direction="column" gap="1">
              <Text size="3" weight="medium">
                {field.label}
              </Text>

              {field.type === "custom" ? (
                field.customComponent
              ) : field.type === "textarea" ? (
                <textarea
                  name={String(field.name)}
                  placeholder={field.placeholder}
                  required={field.required}
                  {...(field.controlled
                    ? {
                        value:
                          field.value ||
                          (state.data.get(String(field.name)) as string) ||
                          "",
                        onChange: (e) =>
                          handleControlledChange(
                            String(field.name),
                            e.target.value
                          ),
                      }
                    : {
                        defaultValue:
                          (state.data.get(String(field.name)) as string) ||
                          initialValues?.[String(field.name)] ||
                          "",
                      })}
                  style={{
                    ...style,
                    height: "7rem",
                    resize: "none",
                  }}
                />
              ) : field.type === "select" ? (
                <select
                  name={String(field.name)}
                  required={field.required}
                  {...(field.controlled
                    ? {
                        value: field.value || "",
                        onChange: (e) =>
                          handleControlledChange(
                            String(field.name),
                            e.target.value
                          ),
                      }
                    : {
                        defaultValue:
                          (state.data.get(String(field.name)) as string) ||
                          initialValues?.[String(field.name)] ||
                          "",
                      })}
                  style={style}
                >
                  {field.placeholder && (
                    <option value="" disabled>
                      {field.placeholder}
                    </option>
                  )}
                  {field.options?.map(
                    (option: { value: string; label: string }) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              ) : (
                <input
                  type={field.type}
                  name={String(field.name)}
                  placeholder={field.placeholder}
                  required={field.required}
                  {...(field.controlled
                    ? {
                        value: field.value || "",
                        onChange: (e) =>
                          handleControlledChange(
                            String(field.name),
                            e.target.value
                          ),
                      }
                    : {
                        defaultValue:
                          (state.data.get(String(field.name)) as string) ||
                          initialValues?.[String(field.name)] ||
                          "",
                      })}
                  style={style}
                />
              )}

              {field.description && (
                <Text size="1" color="gray">
                  {field.description}
                </Text>
              )}

              {/* Real-time validation feedback */}
              {field.message && <div>{field.message}</div>}

              {/* Server-side validation errors */}
              {state.fieldErrors?.[String(field.name)]?.map(
                (error: string, index: number) => (
                  <Text
                    size="1"
                    color="red"
                    key={`${String(field.name)}-${index}`}
                  >
                    {error}
                  </Text>
                )
              )}
            </Flex>
          </div>
        ))}

        <Flex mt="4" justify="end">
          <Flex direction="column" gap="2">
            <Button
              size="3"
              type="submit"
              disabled={
                pending || fields.some((field) => field.isValid === false)
              }
              loading={pending}
            >
              {submitButtonText}
            </Button>
            {state?.message && (
              <Text size="1" color={state.success ? "green" : "red"}>
                {state.message}
              </Text>
            )}
          </Flex>
        </Flex>
      </Flex>
    </Form>
  );
}
