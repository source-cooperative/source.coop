"use client";

import { useActionState } from "react";
import { Button, Text, Flex } from "@radix-ui/themes";
import Form from "next/form";

export interface FormField {
  label: string;
  name: string;
  type: "text" | "textarea" | "email" | "url" | "password" | "number" | "tel";
  required?: boolean;
  description?: string;
  placeholder?: string;
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
}: DynamicFormProps<T>) {
  const [state, formAction, pending] = useActionState(action, {
    message: "",
    data: new FormData(),
    fieldErrors: {},
    success: false,
  });
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

              {field.type === "textarea" ? (
                <textarea
                  name={field.name}
                  placeholder={field.placeholder}
                  required={field.required}
                  defaultValue={(state.data.get(field.name) as string) || ""}
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
                  defaultValue={(state.data.get(field.name) as string) || ""}
                  style={style}
                />
              )}

              {field.description && (
                <Text size="1" color="gray">
                  {field.description}
                </Text>
              )}

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
            <Button size="3" type="submit" disabled={pending} loading={pending}>
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
