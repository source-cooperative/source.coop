import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@radix-ui/themes";
import { FormActions } from "./FormActions";

/**
 * The single action row a form ends with.
 *
 * The secondary action is a prop rather than a sibling of the form: passed as a
 * sibling it produced a second right-aligned row stacked under the submit,
 * which in a dialog reads as two competing footers.
 */
const meta = {
  title: "Components/Forms/FormActions",
  component: FormActions,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FormActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { submitLabel: "Save" },
};

/** Mid-submit: the button reports it rather than the page going quiet. */
export const Pending: Story = {
  args: { submitLabel: "Save", pending: true },
};

export const Disabled: Story = {
  args: { submitLabel: "Save", disabled: true },
};

export const WithSecondaryAction: Story = {
  args: {
    submitLabel: "Send invitation",
    secondary: (
      <Button type="button" size="3" variant="soft" color="gray">
        Cancel
      </Button>
    ),
  },
};

/** Failure is reported in the row that caused it, not at the top of the page. */
export const WithError: Story = {
  args: {
    submitLabel: "Save",
    message: "That account ID is already taken",
    success: false,
  },
};

export const WithSuccess: Story = {
  args: { submitLabel: "Save", message: "Saved", success: true },
};
