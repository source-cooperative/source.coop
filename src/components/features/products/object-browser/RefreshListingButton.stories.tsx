import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RefreshListingButton } from "./RefreshListingButton";

/**
 * Sits in the header of a product's Contents card and reloads the list of
 * objects at the current path, picking up files added or removed elsewhere —
 * from the CLI, say — without reloading the whole page. It shows a spinner
 * until the new listing arrives.
 */
const meta = {
  title: "Features/Object browser/RefreshListingButton",
  component: RefreshListingButton,
  parameters: { layout: "centered" },
} satisfies Meta<typeof RefreshListingButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
