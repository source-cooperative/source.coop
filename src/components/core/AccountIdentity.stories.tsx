import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Avatar, Box } from "@radix-ui/themes";
import { AccountIdentity, accountCardSurface } from "./AccountIdentity";

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
  title: "Accounts/AccountIdentity",
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
    name: "Chris Holmes",
    accountId: "cholmes",
    avatar: initial("Chris Holmes"),
  },
};

/** Size 2 is what the picker's suggestion rows use, so the list stays dense. */
export const InAList: Story = {
  args: { ...Default.args, size: "2" },
};

/** On the shared card surface, which is how both callers present it. */
export const OnCardSurface: Story = {
  args: Default.args,
  render: (args) => (
    <Box p="4" style={{ ...accountCardSurface, maxWidth: 300 }}>
      <AccountIdentity {...args} />
    </Box>
  ),
};

/** A long display name must not push the handle out of the row. */
export const LongName: Story = {
  args: {
    name: "The Cascadia Marine Acoustics Research Collective",
    accountId: "cascadia-research",
    avatar: initial("The Cascadia"),
  },
};
