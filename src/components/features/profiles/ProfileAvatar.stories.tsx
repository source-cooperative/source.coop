import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Flex } from "@radix-ui/themes";
import { ProfileAvatar } from "./ProfileAvatar";
import type { Account } from "@/types";

/**
 * An account's picture, with a three-step fallback: an uploaded
 * `profile_image`, then Gravatar for individuals with a primary email, then
 * the first letter of the display name.
 *
 * Shape carries the account type — individuals are round, organizations
 * squared — which is the only thing distinguishing them in a mixed list.
 */
const meta = {
  title: "Profiles/ProfileAvatar",
  component: ProfileAvatar,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProfileAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

const individual = {
  account_id: "giswqs",
  name: "Qiusheng Wu",
  type: "individual",
} as unknown as Account;

const organization = {
  account_id: "cascadia-research",
  name: "Cascadia Research",
  type: "organization",
} as unknown as Account;

/** No image and no email: the initial. */
export const Initial: Story = {
  args: { account: individual },
};

/** Round for a person, squared for an organization. */
export const Shapes: Story = {
  args: { account: individual },
  render: () => (
    <Flex align="center" gap="3">
      <ProfileAvatar account={individual} />
      <ProfileAvatar account={organization} />
    </Flex>
  ),
};

export const Sizes: Story = {
  args: { account: individual },
  render: () => (
    <Flex align="center" gap="3">
      <ProfileAvatar account={individual} size="1" />
      <ProfileAvatar account={individual} size="2" />
      <ProfileAvatar account={individual} size="4" />
      <ProfileAvatar account={individual} size="6" />
    </Flex>
  ),
};

/**
 * An uploaded image wins over both fallbacks. Inline SVG rather than a hosted
 * URL so the story does not depend on the network.
 */
export const WithImage: Story = {
  args: {
    account: {
      ...individual,
      metadata_public: {
        profile_image:
          "data:image/svg+xml," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">' +
              '<rect width="96" height="96" fill="#4a7ba7"/>' +
              '<circle cx="48" cy="38" r="16" fill="#fff"/>' +
              '<ellipse cx="48" cy="82" rx="26" ry="22" fill="#fff"/></svg>'
          ),
      },
    } as unknown as Account,
  },
};
