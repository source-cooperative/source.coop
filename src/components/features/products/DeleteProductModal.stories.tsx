import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DeleteProductModal } from "./DeleteProductModal";

/**
 * Deleting a product, behind a typed confirmation.
 *
 * Same category as `DangerZone`: in the app the only way to see this is to
 * nearly delete something. **Click the trigger and type the product id** — the
 * confirm stays disabled until the text matches, which is the behaviour worth
 * checking.
 *
 * `deleteProduct` is an `fn()` stub here, so confirming does nothing.
 */
const meta = {
  title: "Products/DeleteProductModal",
  component: DeleteProductModal,
  parameters: { layout: "padded" },
  args: {
    accountId: "miskatonic",
    productId: "abyssal-acoustics",
  },
} satisfies Meta<typeof DeleteProductModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Objects go with the product. */
export const Default: Story = {};

/**
 * Account-owned storage, so the record can be deleted while the objects stay.
 * The server re-checks this regardless of what the UI sends.
 */
export const CanPreserveData: Story = {
  args: { canPreserveData: true },
};

/**
 * A read-only connection: Source never deletes its data, so the keep-data
 * option is forced on and locked rather than merely defaulted.
 */
export const ReadOnlyConnection: Story = {
  args: { canPreserveData: true, dataReadOnly: true },
};
