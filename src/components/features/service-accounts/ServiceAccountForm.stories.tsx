import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ServiceAccountForm } from "./ServiceAccountForm";

/**
 * Creating a service account: who it is, how software signs in as it, and what
 * it may reach.
 *
 * The id fills itself in from the name until it is edited by hand. A GitHub
 * workflow is pinned to one repository and one ref or environment, and the
 * exact subject it binds is shown beneath it as you type. Products come from
 * the owner; each ticked one gets a read or read-and-write choice.
 *
 * `createServiceAccount` is mocked in `.storybook/preview.tsx` and resolves as
 * though the account were created, so **submitting shows the post-create view**
 * with a workflow step per workflow named.
 */
const meta = {
  title: "Features/Service accounts/ServiceAccountForm",
  component: ServiceAccountForm,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ServiceAccountForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    ownerAccountId: "miskatonic",
    products: [
      { product_id: "climate-data", title: "Climate Data" },
      { product_id: "reference-data", title: "Reference Data" },
    ],
  },
};

/** An owner with nothing to grant yet. */
export const NoProducts: Story = {
  args: { ownerAccountId: "acoltrane", products: [] },
};
