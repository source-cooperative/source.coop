import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { InviteMemberForm } from "./InviteMemberForm";
import type { Account } from "@/types";

/**
 * Invite someone to an organization.
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
 *
 * There is no product-scoped story. Passing a `product` changes only two hidden
 * fields — `organization_id` and `product_id` — so it renders identically, and
 * a story showing the same thing twice teaches that they differ when they do
 * not. Worth noting while looking at this: in the product case the description
 * still reads "join {organization.name}", naming the organization rather than
 * the product.
 */
const meta = {
  title: "Features/Memberships/InviteMemberForm",
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

export const Default: Story = {
  args: { organization },
};
