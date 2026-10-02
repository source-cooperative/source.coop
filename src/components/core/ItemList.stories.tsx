import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, Flex, Text, TextField } from "@radix-ui/themes";
import { ItemList } from "./ItemList";

/**
 * One item in a list of settings-like objects: data connections, service
 * accounts, API keys, the products an account reaches.
 *
 * Every such list shares this row, so they read as one kind of object and
 * cannot drift apart. `ItemList.Root` is the one bordered box with hairline
 * separators; each `ItemList.Row` sits in it, with at most one
 * `ItemList.Marker` beside its name.
 */
const meta = {
  title: "Components/Layout/ItemList",
  component: ItemList.Row,
  parameters: { layout: "padded" },
  render: (args) => (
    <ItemList.Root>
      <ItemList.Row {...args} />
    </ItemList.Root>
  ),
} satisfies Meta<typeof ItemList.Row>;

export default meta;
type Story = StoryObj<typeof meta>;

const title = (name: string) => (
  <Text size="2" weight="medium">
    {name}
  </Text>
);

const quiet = (text: string) => (
  <Text size="1" color="gray">
    {text}
  </Text>
);

/**
 * A row with an `href` opens that page and is one link from edge to edge:
 * hover anywhere on it and the background tints and the chevron fills, as a
 * high-contrast button does. Links inside the row keep their own target.
 */
export const Default: Story = {
  args: {
    href: "#",
    title: title("[PROD] AWS Open Data (US-West-2)"),
    meta: "s3 · aws-opendata-us-west-2 · us-west-2 · system",
    aside: quiet("public"),
  },
};

/**
 * A marker labels deliberate state beside the name — read only, primary,
 * disabled. It is the only chip on a row, so it is used where true and left
 * out where false.
 */
export const WithMarker: Story = {
  args: {
    ...Default.args,
    markers: <ItemList.Marker>Read only</ItemList.Marker>,
  },
};

/**
 * A row that acts in place leaves `href` unset and puts its controls in
 * `actions`. It has no hover state, because the row itself does nothing.
 */
export const InPlace: Story = {
  args: {
    title: title("HPC cron job"),
    meta: "sck_…Xy9QeT · expires 12 Mar 2027",
    actions: (
      <Button size="1" variant="soft" color="red">
        Revoke
      </Button>
    ),
  },
};

/** The tinted strip is for a value that can be edited without leaving the row. */
export const WithFooter: Story = {
  args: {
    title: title("Miskatonic Archive"),
    meta: "s3 · miskatonic-archive",
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
};

/**
 * Several rows in one `ItemList.Root`. One bordered box with hairlines holds up at
 * thirty rows, where a card each would be a page that is mostly gaps.
 */
export const AList: Story = {
  args: Default.args,
  render: () => (
    <ItemList.Root>
      <ItemList.Row
        href="#"
        title={title("Nightly Sync")}
        meta="miskatonic--nightly-sync"
        aside={quiet("1 workflow · 1 API key")}
      />
      <ItemList.Row
        href="#"
        title={title("Archive Mirror")}
        markers={<ItemList.Marker>Disabled</ItemList.Marker>}
        meta="miskatonic--archive-mirror"
        aside={quiet("0 workflows · 0 API keys")}
      />
      <ItemList.Row
        href="#"
        title={title("Black Mesa Survey Files")}
        markers={<ItemList.Marker>Read only</ItemList.Marker>}
        meta="gcs · black-mesa-files"
        aside={quiet("public, unlisted")}
      />
    </ItemList.Root>
  ),
};
