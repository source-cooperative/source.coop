import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Dialog } from "@radix-ui/themes";
import { TypedConfirmDialog } from "./TypedConfirmDialog";

/**
 * A destructive action behind a dialog that unlocks only once the user types
 * what they are about to destroy — the shape behind `DeleteProductModal` and
 * `DeleteAllObjectsModal`.
 *
 * **Click the trigger and type the text shown**: the confirm stays disabled
 * until it matches. Confirming runs the action and closes the dialog, unless
 * the action answers with a message, which the dialog shows and stays open
 * for (see `DeleteProductModal`'s NonEmptyProduct story).
 */
const meta = {
  title: "Components/Controls/TypedConfirmDialog",
  component: TypedConfirmDialog,
  parameters: { layout: "padded", docs: { story: { inline: false, iframeHeight: 420 } } },
  args: {
    label: "Delete widget",
    title: "Delete widget",
    expectedText: "miskatonic/abyssal-acoustics",
    onConfirm: fn(),
    children: (
      <Dialog.Description size="2">
        The widget will be permanently deleted. This cannot be undone.
      </Dialog.Description>
    ),
  },
} satisfies Meta<typeof TypedConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
