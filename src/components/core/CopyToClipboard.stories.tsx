import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Flex } from "@radix-ui/themes";
import { CopyToClipboard } from "./CopyToClipboard";
import { MonoText } from "./MonoText";

/**
 * Copy button that confirms itself: the icon becomes a green check for 1.5s,
 * then reverts.
 *
 * Click it in this frame to see the transition — the confirmation is the whole
 * behaviour, and it is invisible in a screenshot.
 */
const meta = {
  title: "Components/Controls/CopyToClipboard",
  component: CopyToClipboard,
  parameters: { layout: "padded" },
} satisfies Meta<typeof CopyToClipboard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { text: "s3://miskatonic-archive/abyssal-acoustics" },
};

/** Where it actually appears: at the end of a value worth copying. */
export const BesideAValue: Story = {
  args: { text: "AKIAIOSFODNN7EXAMPLE" },
  render: (args) => (
    <Flex align="center" gap="2">
      <MonoText size="2">AKIAIOSFODNN7EXAMPLE</MonoText>
      <CopyToClipboard {...args} />
    </Flex>
  ),
};
