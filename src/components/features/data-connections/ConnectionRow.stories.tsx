import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, Flex, Text, TextField } from "@radix-ui/themes";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import {
  ConnectionList,
  ConnectionMarker,
  ConnectionRow,
  ConnectionsEmpty,
} from "./ConnectionRow";

/**
 * One data connection in a list.
 *
 * Two different lists render the same entity — an account's connections, and
 * the ones backing a product — so they share this row. The point of the
 * component is that they cannot drift apart, which is exactly the claim a
 * story can settle and a screenshot of one page cannot.
 */
const meta = {
  title: "Data connections/ConnectionRow",
  component: ConnectionRow,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ConnectionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const title = (name: string) => (
  <Text size="2" weight="medium">
    {name}
  </Text>
);

export const Default: Story = {
  args: {
    title: title("[PROD] AWS Open Data (US-West-2)"),
    meta: "s3 · aws-opendata-us-west-2 · us-west-2 · system",
    aside: (
      <Text size="1" color="gray">
        public
      </Text>
    ),
    actions: <ChevronRightIcon color="var(--gray-9)" />,
  },
  render: (args) => (
    <ConnectionList>
      <ConnectionRow {...args} />
    </ConnectionList>
  ),
};

/**
 * Read-only is the one state worth marking. It is deliberate configuration,
 * not a fault, so it is marked where true and unmentioned where false.
 */
export const WithMarker: Story = {
  args: {
    ...Default.args,
    markers: <ConnectionMarker>Read only</ConnectionMarker>,
  },
  render: Default.render,
};

/** The tinted strip is for a value that can be edited without leaving the row. */
export const WithFooter: Story = {
  args: {
    ...Default.args,
    footer: (
      <Flex align="center" gap="2">
        <Text size="1" color="gray">
          Prefix
        </Text>
        <TextField.Root size="1" defaultValue="rainfall/" style={{ flex: 1 }} />
        <Button size="1" variant="soft">
          Save
        </Button>
      </Flex>
    ),
  },
  render: Default.render,
};

/**
 * The reason this is one bordered container with hairlines rather than a card
 * each: a card per connection looked fine at three rows and fell apart at
 * thirty, which an account holding every regional Open Data connection has.
 */
export const AList: Story = {
  args: Default.args,
  render: () => (
    <ConnectionList>
      <ConnectionRow
        title={title("[PROD] Azure Open Data (West Europe)")}
        markers={<ConnectionMarker>Read only</ConnectionMarker>}
        meta="azure · opendatastore/westeurope · westeurope · system"
        aside={
          <Text size="1" color="gray">
            public
          </Text>
        }
        actions={<ChevronRightIcon color="var(--gray-9)" />}
      />
      <ConnectionRow
        title={title("RLE Assessment Files")}
        markers={<ConnectionMarker>Read only</ConnectionMarker>}
        meta="gcs · rle-files · Tyler Erickson"
        aside={
          <Text size="1" color="gray">
            public, unlisted
          </Text>
        }
        actions={<ChevronRightIcon color="var(--gray-9)" />}
      />
      <ConnectionRow
        title={title("Cascadia Archive")}
        meta="s3 · cascadia-archive · us-west-2 · Cascadia Research"
        aside={
          <Text size="1" color="gray">
            permits nothing
          </Text>
        }
        actions={<ChevronRightIcon color="var(--gray-9)" />}
      />
    </ConnectionList>
  ),
};

/** Shared so the account list and the product list cannot disagree about it. */
export const Empty: Story = {
  args: Default.args,
  render: () => (
    <ConnectionList>
      <ConnectionsEmpty>
        Create a data connection to get started.
      </ConnectionsEmpty>
    </ConnectionList>
  ),
};
