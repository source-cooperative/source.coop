import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { InviteMemberForm } from "./InviteMemberForm";
import type { Account, Product } from "@/types";

/**
 * Invite someone to an organization, or to a single product.
 *
 * Small, but worth a story for one reason: **this is the dialog the account
 * picker's suggestion list was clipped inside.** It sits in a `Dialog.Content`
 * with its own scroll box, so a list positioned inside the field got cut off at
 * the dialog's edge. The fix was to portal it out, and this story is where that
 * regresses visibly.
 *
 * **Open the dialog and type two or more characters** into the User field. The
 * suggestions come from the mocked `searchAccounts`; the list should overflow
 * the dialog rather than being clipped by it.
 */
const meta = {
  title: "Accounts/InviteMemberForm",
  component: InviteMemberForm,
  parameters: { layout: "padded" },
} satisfies Meta<typeof InviteMemberForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const organization = {
  account_id: "miskatonic",
  name: "Miskatonic University",
  type: "organization",
} as unknown as Account;

const product = {
  account_id: "miskatonic",
  product_id: "abyssal-acoustics",
  title: "Abyssal Acoustics",
} as unknown as Product;

export const ToAnOrganization: Story = {
  args: { organization },
};

/** Scoped to one product rather than the whole organization. */
export const ToAProduct: Story = {
  args: { organization, product },
};
