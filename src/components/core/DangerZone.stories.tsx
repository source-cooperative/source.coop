import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, Flex, Text } from "@radix-ui/themes";
import { LockClosedIcon } from "@radix-ui/react-icons";
import { DangerZone, DangerZoneItem } from "./DangerZone";

/**
 * Where irreversible actions live — another section of the page, same heading
 * and rule as every other, carried in red. Each action is a `DangerZoneItem`:
 * what it does on the left, its control on the right.
 *
 * Purely visual, and the only places in the app it appears are things you
 * happen to be allowed to delete, so this is the practical way to review it.
 */
const meta = {
  title: "Components/Layout/DangerZone",
  component: DangerZone,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DangerZone>;

export default meta;
type Story = StoryObj<typeof meta>;

const deleteConnection = (disabled = false) => (
  <Button size="2" color="red" variant="soft" disabled={disabled}>
    Delete connection
  </Button>
);

export const Default: Story = {
  args: {
    children: (
      <DangerZoneItem
        title="Delete this connection"
        description="Removes the connection record and its stored credentials. The bucket and its objects are not touched."
        action={deleteConnection()}
      />
    ),
  },
};

/**
 * The action is blocked, and the reason sits under the explanation rather than
 * beside the button — it is a reason, not a control.
 */
export const Blocked: Story = {
  args: {
    children: (
      <DangerZoneItem
        title="Delete this connection"
        description="Removes the connection record and its stored credentials. The bucket and its objects are not touched."
        action={deleteConnection(true)}
        note={
          <Flex align="center" gap="1">
            <LockClosedIcon width="14" height="14" color="var(--red-11)" />
            <Text size="1" color="red">
              Blocked: 3 products still use it. Remove it from each first.
            </Text>
          </Flex>
        }
      />
    ),
  },
};

/** Several actions share the one zone, ruled apart. */
export const SeveralActions: Story = {
  args: {
    children: (
      <>
        <DangerZoneItem
          title="Delete all objects"
          description="Permanently deletes every object stored in this product. The product itself stays."
          action={
            <Button size="2" color="red" variant="outline">
              Delete all objects
            </Button>
          }
        />
        <DangerZoneItem
          title="Delete this product"
          description="Permanently removes the product and its memberships. A product that still holds objects can't be deleted."
          action={
            <Button size="2" color="red" variant="outline">
              Delete product
            </Button>
          }
        />
      </>
    ),
  },
};
