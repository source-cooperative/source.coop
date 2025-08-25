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

interface DynamicFormProps {
  fields: FormField[];
  action: (formData: FormData) => void | Promise<void>;
  submitButtonText?: string;
  hiddenFields?: Record<string, string>;
  className?: string;
}

export function DynamicForm({
  fields,
  action,
  submitButtonText = "Submit",
  hiddenFields = {},
  className,
}: DynamicFormProps) {
  return (
    <Form action={action} className={className}>
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
                  style={{
                    fontFamily: "var(--code-font-family)",
                    width: "100%",
                    height: "7rem",
                    resize: "none",
                    padding: "8px 12px",
                    borderRadius: "0",
                    border: "1px solid var(--gray-6)",
                    backgroundColor: "var(--gray-1)",
                    fontSize: "16px",
                    lineHeight: "1.5",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <input
                  type={field.type}
                  name={field.name}
                  placeholder={field.placeholder}
                  required={field.required}
                  style={{
                    fontFamily: "var(--code-font-family)",
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "0",
                    border: "1px solid var(--gray-6)",
                    backgroundColor: "var(--gray-1)",
                    fontSize: "16px",
                    lineHeight: "1.5",
                    boxSizing: "border-box",
                  }}
                />
              )}

              {field.description && (
                <Text size="1" color="gray">
                  {field.description}
                </Text>
              )}
            </Flex>
          </div>
        ))}

        <Flex mt="4" justify="end">
          <Button size="3" type="submit">
            {submitButtonText}
          </Button>
        </Flex>
      </Flex>
    </Form>
  );
}
