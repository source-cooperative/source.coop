import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FormSkeleton } from "./FormSkeleton";

/**
 * What a form page shows while its data loads. Worth comparing against a real
 * form — a skeleton whose proportions do not match what replaces it produces a
 * visible jump on load.
 */
const meta = {
  title: "Components/Forms/FormSkeleton",
  component: FormSkeleton,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FormSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Short: Story = {
  args: { fieldCount: 2 },
};

export const WithoutSubmit: Story = {
  args: { fieldCount: 3, showSubmitButton: false },
};
