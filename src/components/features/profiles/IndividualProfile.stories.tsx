import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IndividualProfile } from "./IndividualProfile";
import type { IndividualAccount, OrganizationalAccount } from "@/types";

/**
 * A person's profile page. The organization list is the interesting part: it
 * is a grid that drops to one column on a phone, where three columns left
 * long names wrapping around their avatars.
 *
 * See the Mobile story for that case.
 */
const meta = {
  title: "Features/Profiles/IndividualProfile",
  component: IndividualProfile,
  parameters: { layout: "padded" },
} satisfies Meta<typeof IndividualProfile>;

export default meta;
type Story = StoryObj<typeof meta>;

// No email, so ProfileAvatar shows an initial rather than fetching Gravatar.
const account = {
  account_id: "cholmes",
  name: "Chris Holmes",
  type: "individual",
  metadata_public: {
    bio: "Works on open geospatial data and cloud-native infrastructure.",
  },
} as unknown as IndividualAccount;

// Real names, long ones included -- they are what breaks the layout.
const organizations = [
  { account_id: "portolan-mirrors", name: "portolan-mirrors" },
  { account_id: "kerner-lab", name: "Kerner Lab" },
  { account_id: "planet", name: "Planet" },
  { account_id: "taylor-geospatial", name: "Taylor Geospatial" },
  { account_id: "fields-of-the-world", name: "Fields of The World" },
  {
    account_id: "fiboa",
    name: "Field Boundaries for Agriculture (fiboa)",
  },
].map(
  (org) =>
    ({
      ...org,
      type: "organization",
      metadata_public: {},
    }) as unknown as OrganizationalAccount
);

export const Default: Story = {
  args: {
    account,
    organizations,
    isOwner: false,
    ownedProducts: [],
    contributedProducts: [],
    canEdit: false,
    canCreateProduct: false,
  },
};

/** The regression this layout exists for: one column, no wrapped names. */
export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: "mobile1", isRotated: false } },
};

export const NoOrganizations: Story = {
  args: { ...Default.args, organizations: [] },
};
