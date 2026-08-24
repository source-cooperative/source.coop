import { Button, Flex, Text } from "@radix-ui/themes";

interface FormActionsProps {
  submitLabel: string;
  pending?: boolean;
  disabled?: boolean;
  /**
   * Secondary action rendered beside the submit button — a Cancel or a
   * Dialog.Close. Passing it here rather than as a sibling of the form keeps a
   * dialog to one action row instead of two stacked ones.
   */
  secondary?: React.ReactNode;
  /** Status line for the last submission. */
  message?: string;
  /** Colours the message: green on success, red otherwise. */
  success?: boolean;
}

/** The single action row a form ends with. */
export function FormActions({
  submitLabel,
  pending,
  disabled,
  secondary,
  message,
  success,
}: FormActionsProps) {
  return (
    <Flex mt="4" direction="column" gap="2" align="end">
      <Flex align="center" gap="3">
        {message && (
          <Text size="1" color={success ? "green" : "red"}>
            {message}
          </Text>
        )}
        {secondary}
        <Button size="3" type="submit" disabled={disabled || pending} loading={pending}>
          {submitLabel}
        </Button>
      </Flex>
    </Flex>
  );
}
