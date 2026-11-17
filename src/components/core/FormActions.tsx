import { Button, Flex, Text } from "@radix-ui/themes";

interface FormActionsProps {
  /**
   * Defaults to "Save". Give it something else only when the form does not
   * save — sending an invitation, running a lookup — or when it creates.
   */
  submitLabel?: string;
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
  /**
   * Whether the form holds changes it hasn't saved (see useFormChanges).
   * Given, it says so beside the button, and the button is disabled until
   * there is something to save. Left out, the button doesn't depend on it.
   */
  unsaved?: boolean;
}

/** The single action row a form ends with. */
export function FormActions({
  submitLabel = "Save",
  pending,
  disabled,
  secondary,
  message,
  success,
  unsaved,
}: FormActionsProps) {
  // A failed save's reason first, since it's what needs fixing; then that
  // there are changes to save, which a past success no longer describes.
  const status =
    message && !success ? (
      <Text size="1" color="red">
        {message}
      </Text>
    ) : unsaved ? (
      <Text size="1" color="gray">
        You have unsaved changes
      </Text>
    ) : message ? (
      <Text size="1" color="green">
        {message}
      </Text>
    ) : null;

  return (
    <Flex mt="4" direction="column" gap="2" align="end">
      <Flex align="center" gap="3">
        {status}
        {secondary}
        {/* highContrast, because the theme's accent is gray: a solid button
            fills with --accent-9 (#8d8d8d), which is 3.31:1 against its white
            label and fails WCAG AA for text. highContrast fills with
            --accent-12 instead — near-black, and Radix's own answer rather than
            an override of its internals. */}
        <Button
          size="3"
          type="submit"
          highContrast
          disabled={disabled || pending || unsaved === false}
          loading={pending}
        >
          {submitLabel}
        </Button>
      </Flex>
    </Flex>
  );
}
