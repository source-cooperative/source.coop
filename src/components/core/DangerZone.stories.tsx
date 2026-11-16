import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, Flex, Text } from "@radix-ui/themes";
import { LockClosedIcon } from "@radix-ui/react-icons";
import { DangerZone } from "./DangerZone";

/**
 * Where irreversible actions live — another section of the page, same heading
 * and rule as every other, carried in red.
 *
 * Purely visual, and the only place in the app it appears is a connection you
 * happen to be allowed to delete, so this is the practical way to review it.
 */
const meta = {
  title: "Components/Layout/DangerZone",
  component: DangerZone,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DangerZone>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Delete this connection",
    description:
      "Removes the connection record and its stored credentials. The bucket and its objects are not touched.",
    action: (
      <Button size="2" color="red" variant="soft">
        Delete connection
      </Button>
    ),
  },
};

/**
 * The action is blocked, and the reason sits under the explanation rather than
 * beside the button — it is a reason, not a control.
 */
export const Blocked: Story = {
  args: {
    ...Default.args,
    action: (
      <Button size="2" color="red" variant="soft" disabled>
        Delete connection
      </Button>
    ),
    note: (
      <Flex align="center" gap="1">
        <LockClosedIcon width="14" height="14" color="var(--red-11)" />
        <Text size="1" color="red">
          Blocked: 3 products still use it. Remove it from each first.
        </Text>
      </Flex>
    ),
  },
};
