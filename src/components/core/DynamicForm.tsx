"use client";

import { useActionState } from "react";
import { Button, Text, Flex } from "@radix-ui/themes";
import Form from "next/form";

export interface FormField {
  label: string;
  name: string;
  type:
    | "text"
    | "textarea"
    | "email"
    | "url"
    | "password"
    | "number"
    | "tel"
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
}

export interface FormState<T> {
  fieldErrors: Record<string, string[]>;
  data: FormData;
  message: string;
  success: boolean;
}

interface DynamicFormProps<T> {
  fields: FormField[];
  action: (
    initialState: any,
    formData: FormData
  ) => Promise<FormState<T>> | FormState<T>;
  submitButtonText?: string;
  hiddenFields?: Record<string, string>;
  className?: string;
  disabled?: boolean;
  initialValues?: Record<string, string>; // Initial values for form fields
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

export function DynamicForm<T>({
  fields,
  action,
  submitButtonText = "Submit",
  hiddenFields = {},
  className,
  disabled = false,
  initialValues = {},
}: DynamicFormProps<T>) {
  const [state, formAction, pending] = useActionState(action, {
    message: "",
    data: new FormData(),
    fieldErrors: {},
    success: false,
  });

  const handleControlledChange = (fieldName: string, value: string) => {
    const field = fields.find((f) => f.name === fieldName);
    if (field?.onValueChange) {
      field.onValueChange(value);
    }
  };
  return (
    <Form action={formAction} className={className}>
      {/* Hidden fields */}
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <Flex direction="column" gap="4">
        {fields.map((field) => (
          <div key={field.name}>
            <Flex direction="column" gap="1">
              <Text size="3" weight="medium">
                {field.label}
              </Text>

              {field.type === "custom" ? (
                field.customComponent
              ) : field.type === "textarea" ? (
                <textarea
                  name={field.name}
                  placeholder={field.placeholder}
                  required={field.required}
                  {...(field.controlled
                    ? {
                        value:
                          field.value ||
                          (state.data.get(field.name) as string) ||
                          "",
                        onChange: (e) =>
                          handleControlledChange(field.name, e.target.value),
                      }
                    : {
                        defaultValue:
                          (state.data.get(field.name) as string) ||
                          initialValues[field.name] ||
                          "",
                      })}
                  style={{
                    ...style,
                    height: "7rem",
                    resize: "none",
                  }}
                />
              ) : (
                <input
                  type={field.type}
                  name={field.name}
                  placeholder={field.placeholder}
                  required={field.required}
                  {...(field.controlled
                    ? {
                        value: field.value || "",
                        onChange: (e) =>
                          handleControlledChange(field.name, e.target.value),
                      }
                    : {
                        defaultValue:
                          (state.data.get(field.name) as string) ||
                          initialValues[field.name] ||
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
              {state.fieldErrors?.[field.name]?.map((error, index) => (
                <Text size="1" color="red" key={`${field.name}-${index}`}>
                  {error}
                </Text>
              ))}
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
