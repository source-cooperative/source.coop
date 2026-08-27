import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FormTitle } from "./FormTitle";

/** The heading a form page opens with. */
const meta = {
  title: "Forms/FormTitle",
  component: FormTitle,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FormTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { title: "Edit Data Connection" },
};

export const WithDescription: Story = {
  args: {
    title: "Edit Data Connection",
    description: "Update this connection's settings and credentials.",
  },
};
