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
 * Submitting goes to the new account's page. With a key, the key goes along
 * in memory and opens over that page, the only time it can be seen — see
 * `IssuedApiKeyDialog`, and `ServiceAccountDetail`'s "Created with a key".
 * Storybook cannot follow either way there, so `createServiceAccount` is
 * mocked in `.storybook/preview.tsx` to resolve without redirecting, and the
 * router's push does nothing.
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
