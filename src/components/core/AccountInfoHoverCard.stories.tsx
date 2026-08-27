import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Text } from "@radix-ui/themes";
import { AccountInfoHoverCard } from "./AccountInfoHoverCard";
import type { Account } from "@/types";

/**
 * The card that introduces an account on hover, wherever a name appears in
 * passing — a product's owner, a connection's owner, a member list.
 *
 * **Hover the name to open it.** The card is the whole component, so a
 * screenshot of the closed state shows nothing.
 */
const meta = {
  title: "Accounts/AccountInfoHoverCard",
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
  account_id: "cholmes",
  name: "Chris Holmes",
  type: "individual",
  metadata_public: {
    bio: "Works on open geospatial data and cloud-native infrastructure.",
  },
} as unknown as Account;

export const Default: Story = {
  args: {
    account,
    children: <Text size="2">Chris Holmes</Text>,
  },
};

/** No bio recorded: the card is the identity block alone, not an empty gap. */
export const WithoutBio: Story = {
  args: {
    account: { ...account, metadata_public: {} } as unknown as Account,
    children: <Text size="2">Chris Holmes</Text>,
  },
};

/** Suppressed entirely — used where the surrounding row is already the account. */
export const Disabled: Story = {
  args: {
    account,
    showHoverCard: false,
    children: <Text size="2">Chris Holmes (no card on hover)</Text>,
  },
};
