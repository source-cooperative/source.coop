import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Flex } from "@radix-ui/themes";
import { WebsiteLink } from "./WebsiteLink";

/**
 * A link on a profile, with an icon chosen from the hostname.
 *
 * The icon is the whole behaviour — GitHub and LinkedIn get their marks, and
 * everything else a generic link — so seeing the set side by side is the only
 * way to check the matching works.
 */
const meta = {
  title: "Features/Profiles/WebsiteLink",
  component: WebsiteLink,
  parameters: { layout: "padded" },
} satisfies Meta<typeof WebsiteLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Generic: Story = {
  args: { url: "https://cholmes.org" },
};

export const KnownHosts: Story = {
  args: { url: "https://github.com/cholmes" },
  render: () => (
    <Flex direction="column" gap="2">
      <WebsiteLink url="https://github.com/cholmes" />
      <WebsiteLink url="https://www.linkedin.com/in/cholmes" />
      <WebsiteLink url="https://cholmes.org" />
    </Flex>
  ),
};

/** A bare hostname is upgraded to https rather than treated as a relative path. */
export const WithoutScheme: Story = {
  args: { url: "cholmes.org" },
};
