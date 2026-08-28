import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Flex, Text } from "@radix-ui/themes";
import { MonoText } from "./MonoText";

/**
 * Text in the code face, for things that are typed rather than written:
 * handles, ids, bucket names, prefixes.
 *
 * It is a one-line wrapper over Radix's Text, and exists so the font is chosen
 * in one place — the face is a `--code-font-family` var, not a literal, so the
 * story is also the check that the webfont actually loaded.
 */
const meta = {
  title: "Components/Typography/MonoText",
  component: MonoText,
  parameters: { layout: "padded" },
} satisfies Meta<typeof MonoText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "cascadia-research/humpback-acoustics" },
};

/** Beside prose, which is the point: it should read as a different kind of thing. */
export const AgainstProse: Story = {
  args: { children: "@cholmes" },
  render: (args) => (
    <Flex direction="column" gap="2">
      <Text size="2">Chris Holmes</Text>
      <MonoText {...args} size="1" color="gray" />
    </Flex>
  ),
};

export const Sizes: Story = {
  args: { children: "s3://cascadia-archive" },
  render: (args) => (
    <Flex direction="column" gap="2">
      <MonoText {...args} size="1" />
      <MonoText {...args} size="2" />
      <MonoText {...args} size="3" />
    </Flex>
  ),
};
