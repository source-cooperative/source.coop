import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ServiceAccountForm } from "./ServiceAccountForm";

/**
 * Creating a service account: who it is, how software signs in as it, and what
 * it may reach.
 *
 * The id fills itself in from the name until it is edited by hand. "Signs in
 * with" and "Can reach" are the sections the account's page has, with the
 * same buttons in their corners. "Add sign-in" opens the same modals too — a
 * GitHub workflow pinned to one repository and one branch, tag or environment, or an
 * API key's label and expiry — but what they collect is held here, as rows
 * that can be removed, until the form is submitted. One key can be issued
 * with the account; more are issued from its page. "Grant a product" adds one
 * of the owner's products with read or read-and-write, held the same way.
 *
 * Submitting goes to the new account's page. With a key, the key goes along
 * in memory and opens over that page, the only time it can be seen — see
 * `ServiceAccountDetail`'s "Created with a key".
 * Storybook cannot follow either way there, so `createServiceAccount` is
 * mocked in `.storybook/preview.tsx` to resolve without redirecting, and the
 * router's push does nothing.
 */
const meta = {
  title: "Features/Settings/Service accounts/Create/ServiceAccountForm",
  component: ServiceAccountForm,
  parameters: { layout: "padded", docs: { story: { inline: false, iframeHeight: 640 } } },
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
