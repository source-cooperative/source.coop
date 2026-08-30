import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Flex, Text } from "@radix-ui/themes";
import { Pencil1Icon } from "@radix-ui/react-icons";
import { EditButton } from "./EditButton";

/** Gear icon linking to an edit page. Ghost by default, so it sits quietly beside a heading. */
const meta = {
  title: "Components/Controls/EditButton",
  component: EditButton,
  parameters: { layout: "padded" },
  args: { href: "/edit/account/miskatonic" },
} satisfies Meta<typeof EditButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <Flex align="center" gap="3">
      <EditButton {...args} variant="ghost" />
      <EditButton {...args} variant="soft" />
      <EditButton {...args} variant="outline" />
      <EditButton {...args} variant="solid" />
    </Flex>
  ),
};

/** The icon is a default, not a fixture. */
export const CustomIcon: Story = {
  args: { children: <Pencil1Icon width="18" height="18" /> },
};

export const BesideAHeading: Story = {
  render: (args) => (
    <Flex align="center" gap="2">
      <Text size="4" weight="bold">
        Miskatonic University
      </Text>
      <EditButton {...args} />
    </Flex>
  ),
};
