import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Flex } from "@radix-ui/themes";
import { Skeleton } from "./Skeleton";

/**
 * Loading placeholder. The pulse comes from a keyframe in `globals.css`, so
 * this story is also the check that the animation survives a theme change.
 */
const meta = {
  title: "Feedback/Skeleton",
  component: Skeleton,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Line: Story = {
  args: { height: "16px", width: "240px" },
};

/** Roughly the shape of a heading over a paragraph. */
export const Block: Story = {
  args: {},
  render: () => (
    <Flex direction="column" gap="2">
      <Skeleton height="32px" width="300px" />
      <Skeleton height="16px" width="400px" />
      <Skeleton height="16px" width="360px" />
    </Flex>
  ),
};
