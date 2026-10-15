import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { mocked, screen, userEvent, within } from "storybook/test";
import { DeleteProductModal } from "./DeleteProductModal";
import { deleteProduct } from "@/lib/actions/products";

/**
 * Deleting a product, behind a typed confirmation.
 *
 * Same category as `DangerZone`: in the app the only way to see this is to
 * nearly delete something. **Click the trigger and type the product id** — the
 * confirm stays disabled until the text matches, which is the behaviour worth
 * checking.
 *
 * Only an empty product can be deleted, so its objects go first, with
 * `DeleteAllObjectsModal`. A read-only connection's objects don't count, since
 * Source never deletes them.
 *
 * `deleteProduct` is an `fn()` stub here, so confirming does nothing.
 */
const meta = {
  title: "Features/Settings/Details/DeleteProductModal",
  component: DeleteProductModal,
  parameters: { layout: "padded", docs: { story: { inline: false, iframeHeight: 560 } } },
  args: {
    accountId: "miskatonic",
    productId: "abyssal-acoustics",
  },
} satisfies Meta<typeof DeleteProductModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The product still holds objects, so the delete is refused and the dialog
 * says why. Opened and confirmed for you.
 */
export const NonEmptyProduct: Story = {
  beforeEach: () => {
    mocked(deleteProduct).mockResolvedValue({
      success: false,
      error: "This product still holds data. Delete its objects before deleting the product.",
    });
  },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Delete Product" }));
    // The dialog portals to the body, outside the story's canvas.
    await userEvent.type(
      await screen.findByPlaceholderText(`${args.accountId}/${args.productId}`),
      `${args.accountId}/${args.productId}`
    );
    const dialog = within(await screen.findByRole("dialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Delete Product" }));
  },
};
