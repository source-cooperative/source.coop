import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Text } from "@radix-ui/themes";
import { AccountInfoHoverCard } from "./AccountInfoHoverCard";
import type { Account } from "@/types";

/**
 * The card that introduces an account on hover, wherever a name appears in
 * passing — a product's owner, a connection's owner, a member list. A service
 * account is marked as one.
 *
 * **Hover the name to open it.** The card is the whole component, so a
 * screenshot of the closed state shows nothing.
 */
const meta = {
  title: "Components/Accounts/AccountInfoHoverCard",
  component: AccountInfoHoverCard,
  parameters: { layout: "padded" },
} satisfies Meta<typeof AccountInfoHoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Cast rather than built out: the card reads four public fields, and a full
// Account here would be mostly irrelevant scaffolding. No email, so
// ProfileAvatar falls back to an initial instead of fetching Gravatar — which
// also keeps the story offline.
const account = {
  account_id: "acoltrane",
  name: "Alice Coltrane",
  type: "individual",
  metadata_public: {
    bio: "Works on open ocean-acoustics data and cloud-native infrastructure.",
  },
} as unknown as Account;

export const Default: Story = {
  args: {
    account,
    children: <Text size="2">Alice Coltrane</Text>,
  },
};

/** No bio recorded: the card is the identity block alone, not an empty gap. */
export const WithoutBio: Story = {
  args: {
    account: { ...account, metadata_public: {} } as unknown as Account,
    children: <Text size="2">Alice Coltrane</Text>,
  },
};

/**
 * A service account, marked with the badge it carries in the account picker
 * and the memberships table.
 */
export const ServiceAccount: Story = {
  args: {
    account: {
      account_id: "miskatonic--nightly-sync",
      name: "Nightly Sync",
      type: "service",
      owner_account_id: "miskatonic",
      metadata_public: {},
    } as unknown as Account,
    children: <Text size="2">Nightly Sync</Text>,
  },
};

/** Suppressed entirely — used where the surrounding row is already the account. */
export const Disabled: Story = {
  args: {
    account,
    showHoverCard: false,
    children: <Text size="2">Alice Coltrane (no card on hover)</Text>,
  },
};
