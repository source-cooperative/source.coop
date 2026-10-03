import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { GrantProductDialog } from "./GrantProductDialog";

/**
 * "Grant a product", in the corner of "Can reach" on the account's page and
 * of "What it can reach" on the create form: a modal to choose one of the
 * owner's products the account does not reach yet, and Read or Read and
 * write. Grant is held until a product is chosen. With nothing left to grant,
 * the button is not shown.
 */
const meta = {
  title: "Features/Service accounts/GrantProductDialog",
  component: GrantProductDialog,
  parameters: { layout: "centered", docs: { story: { inline: false, iframeHeight: 480 } } },
  args: {
    ownerAccountId: "miskatonic",
    onGrant: fn(),
    available: [
      { product_id: "climate-data", title: "Climate Data" },
      { product_id: "field-notes", title: "Field Notes" },
    ],
  },
} satisfies Meta<typeof GrantProductDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
