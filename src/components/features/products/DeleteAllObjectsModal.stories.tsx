import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DeleteAllObjectsModal } from "./DeleteAllObjectsModal";
import {
  S3CredentialsProvider,
  UploadProvider,
} from "@/components/features/uploader";

/**
 * Emptying a product, behind a typed confirmation, from the danger zone of its
 * settings. Only its owners and maintainers see it, and never on a read-only
 * connection, whose objects Source doesn't delete.
 *
 * A product must be empty before it can be deleted, so this is the first of the
 * two steps. **Click the trigger and type the product id** — the confirm stays
 * disabled until the text matches. Confirming closes the dialog and runs the
 * delete in the background, with its progress under Activity in the account
 * menu (see `DeleteProgress`); here there is no data proxy, so it fails there.
 */
const meta = {
  title: "Features/Settings/Details/DeleteAllObjectsModal",
  component: DeleteAllObjectsModal,
  parameters: { layout: "padded", docs: { story: { inline: false, iframeHeight: 420 } } },
  args: {
    accountId: "miskatonic",
    productId: "abyssal-acoustics",
  },
  // The delete runs through the upload manager, so the real providers wrap it.
  decorators: [
    (Story) => (
      <S3CredentialsProvider>
        <UploadProvider>
          <Story />
        </UploadProvider>
      </S3CredentialsProvider>
    ),
  ],
} satisfies Meta<typeof DeleteAllObjectsModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
