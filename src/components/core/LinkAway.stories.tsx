import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LinkAway } from "./LinkAway";

/** Small "there is more over here" link, with a chevron pointing out of the block. */
const meta = {
  title: "Core/Controls/LinkAway",
  component: LinkAway,
  parameters: { layout: "padded" },
  args: { href: "/cascadia-research" },
} satisfies Meta<typeof LinkAway>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "All products" },
};

export const LongLabel: Story = {
  args: { children: "See every product using this data connection" },
};
