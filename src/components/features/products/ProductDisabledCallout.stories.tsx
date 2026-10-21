import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductDisabledCallout } from "./ProductDisabledCallout";
import type { OrganizationalAccount, Product } from "@/types";

/**
 * The warning at the top of a disabled product's page. Only its owners,
 * maintainers and admins ever see it: everyone else is shown a page that
 * says the product does not exist.
 */
const meta = {
  title: "Features/Product page/ProductDisabledCallout",
  component: ProductDisabledCallout,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProductDisabledCallout>;

export default meta;
type Story = StoryObj<typeof meta>;

const account = {
  account_id: "miskatonic",
  name: "Miskatonic University",
  type: "organization",
  disabled: false,
} as unknown as OrganizationalAccount;

const product = {
  account_id: "miskatonic",
  product_id: "abyssal-acoustics",
  title: "Abyssal Acoustics",
  disabled: false,
  account,
} as unknown as Product;

/** The product itself was deactivated. Only an admin can reactivate it. */
export const Deactivated: Story = {
  args: { product: { ...product, disabled: true }, canDelete: false },
};

/**
 * The product's account is disabled, so the product is too, whatever its own
 * state. Its owners can still delete it, and can do nothing else with it.
 */
export const AccountDisabled: Story = {
  args: {
    product: { ...product, account: { ...account, disabled: true } },
    canDelete: false,
  },
};

/** What an owner sees: the same warning, with a way to the delete button. */
export const AccountDisabledOwner: Story = {
  args: { ...AccountDisabled.args, canDelete: true },
};
