import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ServiceAccountForm } from "./ServiceAccountForm";

/**
 * Creating a service account: who it is, how software signs in as it, and what
 * it may reach.
 *
 * The id fills itself in from the name until it is edited by hand. A GitHub
 * workflow is pinned to one repository and one ref or environment, and the
 * exact subject it binds is shown beneath it as you type. "Add an API key"
 * asks for a label and an expiry, for one key issued with the account; more
 * are issued from its page. Products come from
 * the owner: "Grant a product" adds one with read or read-and-write, the same
 * list the account's page uses, held here until the form is submitted.
 *
 * Submitting goes to the new account's page. With a key, it first shows the
 * key — the only time it can be seen — and a button on to that page.
 * Storybook cannot follow the redirect, so `createServiceAccount` is mocked
 * in `.storybook/preview.tsx` to resolve without it, and with a key of the
 * real shape when one was asked for: **add an API key, fill in a name and a
 * label, and submit** to see the show-once view.
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
