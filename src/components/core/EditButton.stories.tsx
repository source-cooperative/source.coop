import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Flex, Text } from "@radix-ui/themes";
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
