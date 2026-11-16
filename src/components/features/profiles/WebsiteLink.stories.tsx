import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Box, Flex } from "@radix-ui/themes";
import { WebsiteLink } from "./WebsiteLink";

/**
 * A link on a profile, with an icon chosen from the hostname.
 *
 * Two things to check here. The icon matching — GitHub and LinkedIn get their
 * marks, everything else a generic link — which only reads side by side. And
 * the shortening: profiles show these in a narrow column, so the URL is elided
 * in the middle rather than allowed to wrap. See Truncation.
 */
const meta = {
  title: "Features/Account page/WebsiteLink",
  component: WebsiteLink,
  parameters: { layout: "padded" },
} satisfies Meta<typeof WebsiteLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const KnownHosts: Story = {
  args: { url: "https://github.com/acoltrane" },
  render: () => (
    <Flex direction="column" gap="2">
      <WebsiteLink url="https://github.com/acoltrane" />
      <WebsiteLink url="https://www.linkedin.com/in/acoltrane" />
      <WebsiteLink url="https://acoltrane.org" />
    </Flex>
  ),
};

/**
 * The narrow column profiles actually show these in. A long URL keeps its host
 * and the end of its path, so two links to the same site stay apart, with the
 * full URL on the title attribute.
 *
 * The character budget is a guess at the column width, so the last row is the
 * one to watch: a single unbroken segment has no boundary to snap to, and CSS
 * truncation catches whatever the guess overshoots.
 */
export const Truncation: Story = {
  args: { url: "https://github.com/source-cooperative/source.coop/tree/main" },
  render: () => (
    <Box width="200px">
      <Flex direction="column" gap="2">
        <WebsiteLink url="https://acoltrane.org" />
        <WebsiteLink url="https://www.linkedin.com/in/some-very-long-handle" />
        <WebsiteLink url="https://github.com/source-cooperative/source.coop/tree/main" />
        <WebsiteLink url="https://example.com/one-single-extremely-long-path-segment" />
      </Flex>
    </Box>
  ),
};
