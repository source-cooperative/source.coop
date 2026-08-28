import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Flex } from "@radix-ui/themes";
import { AvatarLinkCompact, DisplayNameLink } from "./AccountLinks";
import type { Account } from "@/types";

/**
 * The two ways an account is linked to from a list or a byline: with its
 * avatar, or as a bare name. Both carry the hover card.
 *
 * Hover either to see it.
 */
const meta = {
  title: "Components/Accounts/AccountLinks",
  component: AvatarLinkCompact,
  parameters: { layout: "padded" },
} satisfies Meta<typeof AvatarLinkCompact>;

export default meta;
type Story = StoryObj<typeof meta>;

// No email, so ProfileAvatar shows an initial rather than fetching Gravatar.
const individual = {
  account_id: "acoltrane",
  name: "Alice Coltrane",
  type: "individual",
  metadata_public: {
    bio: "Works on open ocean-acoustics data and cloud-native infrastructure.",
  },
} as unknown as Account;

const organization = {
  account_id: "miskatonic",
  name: "Miskatonic University",
  type: "organization",
  metadata_public: { bio: "Deep-ocean acoustics and abyssal survey data." },
} as unknown as Account;

export const Compact: Story = {
  args: { account: individual },
};

export const CompactWithHandle: Story = {
  args: { account: individual, showAccountId: true },
};

/** Organizations get a squared avatar; individuals a round one. */
export const OrganizationAndIndividual: Story = {
  args: { account: individual },
  render: () => (
    <Flex direction="column" gap="3">
      <AvatarLinkCompact account={individual} />
      <AvatarLinkCompact account={organization} />
    </Flex>
  ),
};

/** Unlinked — for use inside something that is already a link. */
export const NotALink: Story = {
  args: { account: individual, link: false },
};

export const NameOnly: Story = {
  args: { account: individual },
  render: () => <DisplayNameLink account={individual} />,
};
