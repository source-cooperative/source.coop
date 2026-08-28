import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Text } from "@radix-ui/themes";
import { SmallColumnContainer } from "./SmallColumnContainer";

/**
 * Centred column that caps line length on text-heavy pages.
 *
 * The story frame is already narrow, so set the Storybook viewport wide to see
 * it do anything — the cap is what it is for.
 */
const meta = {
  title: "Core/Layout/SmallColumnContainer",
  component: SmallColumnContainer,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SmallColumnContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

const filler =
  "Source Cooperative is a neutral, non-profit data-sharing utility that allows trusted organizations to share data without purchasing a data portal SaaS subscription or managing infrastructure.";

export const Default: Story = {
  args: {
    children: (
      <Text as="p" size="3">
        {filler}
      </Text>
    ),
  },
};

export const Narrow: Story = {
  args: {
    maxWidth: "400px",
    children: (
      <Text as="p" size="3">
        {filler}
      </Text>
    ),
  },
};
