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
 * Submitting goes to the new account's page, where each workflow's example
 * usage is a click away. Storybook cannot follow that redirect, so
 * `createServiceAccount` is mocked in `.storybook/preview.tsx` to resolve
 * without it.
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
