import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OrganizationProfile } from "./OrganizationProfile";
import type { IndividualAccount, OrganizationalAccount } from "@/types";

/**
 * An organization's profile page: its details, its people and its products.
 */
const meta = {
  title: "Features/Account page/OrganizationProfile",
  component: OrganizationProfile,
  parameters: { layout: "padded" },
} satisfies Meta<typeof OrganizationProfile>;

export default meta;
type Story = StoryObj<typeof meta>;

// No email, so ProfileAvatar shows an initial rather than fetching Gravatar.
const account = {
  account_id: "miskatonic",
  name: "Miskatonic University",
  type: "organization",
  disabled: false,
  metadata_public: {
    bio: "Expeditions, archives and acoustic surveys of the deep ocean.",
    location: "Arkham, Massachusetts",
  },
} as unknown as OrganizationalAccount;

const owner = {
  account_id: "wdyer",
  name: "William Dyer",
  type: "individual",
  metadata_public: {},
} as unknown as IndividualAccount;

export const Default: Story = {
  args: {
    account,
    products: [],
    owners: [owner],
    admins: [],
    members: [],
    canEdit: false,
    canCreateProduct: false,
  },
};

/**
 * A disabled organization, as its members see it. To everyone else its page
 * does not exist. It can't be edited, takes no new products, and its products
 * can only be deleted.
 */
export const Disabled: Story = {
  args: { ...Default.args, account: { ...account, disabled: true } },
};
