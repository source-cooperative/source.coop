import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Avatar } from "@radix-ui/themes";
import { AccountIdentity } from "./AccountIdentity";

/**
 * How an account is introduced anywhere it appears out of context: avatar,
 * display name, handle.
 *
 * Shared by the profile hover card and the account picker's suggestions, so a
 * person looks the same in the list they are picked from as in the card that
 * confirms who they are. The avatar is a slot rather than derived, because
 * callers hold different amounts: a profile page has a whole Account and can
 * fall back to Gravatar, a search result has only public fields.
 */
const meta = {
  title: "Components/Accounts/AccountIdentity",
  component: AccountIdentity,
  parameters: { layout: "padded" },
} satisfies Meta<typeof AccountIdentity>;

export default meta;
type Story = StoryObj<typeof meta>;

const initial = (name: string) => (
  <Avatar size="2" radius="full" fallback={name[0].toUpperCase()} />
);

export const Default: Story = {
  args: {
    name: "Alice Coltrane",
    accountId: "acoltrane",
    avatar: initial("Alice Coltrane"),
  },
};

/** Size 2 is what the picker's suggestion rows use, so the list stays dense. */
export const InAList: Story = {
  args: { ...Default.args, size: "2" },
};

/** A long display name must not push the handle out of the row. */
export const LongName: Story = {
  args: {
    name: "The Miskatonic University Institute of Oceanography",
    accountId: "miskatonic",
    avatar: initial("The Miskatonic"),
  },
};
