import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DataConnectionsList } from "./DataConnectionsList";
import type { Account, DataConnection } from "@/types";
import { DataProvider } from "@/types";

/**
 * An account's data connections, or every connection in the admin view.
 *
 * The identifier line reads backend · bucket · region · owner — which backend,
 * which bucket, which region, whose. The connection id is deliberately absent:
 * it is slugified from the name directly above it.
 */
const meta = {
  title: "Features/Data connections/DataConnectionsList",
  component: DataConnectionsList,
  parameters: { layout: "padded" },
  args: { editHref: (id: string) => `/admin/data-connections/${id}` },
} satisfies Meta<typeof DataConnectionsList>;

export default meta;
type Story = StoryObj<typeof meta>;

// Cast once, at the boundary: the list reads a handful of fields, and building
// valid DataConnections here would be pages of irrelevant scaffolding.
const connections = [
  {
    data_connection_id: "aws-opendata-us-west-2",
    name: "[PROD] AWS Open Data (US-West-2)",
    details: {
      provider: DataProvider.S3,
      bucket: "aws-opendata-us-west-2",
      base_prefix: "",
      region: "us-west-2",
    },
    read_only: true,
    allowed_visibilities: ["public"],
  },
  {
    data_connection_id: "azure-opendata-west-europe",
    name: "[PROD] Azure Open Data (West Europe)",
    details: {
      provider: DataProvider.Azure,
      account_name: "opendatastore",
      container_name: "westeurope",
      base_prefix: "",
      region: "westeurope",
    },
    read_only: true,
    allowed_visibilities: ["public"],
  },
  {
    data_connection_id: "black-mesa-files",
    name: "Black Mesa Survey Files",
    owner: "mingus",
    details: {
      provider: DataProvider.GCS,
      bucket: "black-mesa-files",
      base_prefix: "",
    },
    read_only: true,
    allowed_visibilities: ["public", "unlisted"],
  },
  {
    data_connection_id: "miskatonic-archive",
    name: "Miskatonic Archive",
    owner: "miskatonic",
    details: {
      provider: DataProvider.S3,
      bucket: "miskatonic-archive",
      base_prefix: "",
      region: "us-west-2",
    },
    read_only: false,
    // Permits nothing, which the row states rather than leaving blank.
    allowed_visibilities: [],
  },
] as unknown as DataConnection[];

const ownerAccounts = {
  mingus: {
    account_id: "mingus",
    name: "Charles Mingus",
    type: "individual",
  },
  miskatonic: {
    account_id: "miskatonic",
    name: "Miskatonic University",
    type: "organization",
  },
} as unknown as Record<string, Account>;

/**
 * An account's own list. Ownership is omitted: every connection here has the
 * same owner, so printing it on each row says nothing.
 */
export const AccountScoped: Story = {
  args: { connections },
};

/**
 * The admin view, where ownership varies and is therefore worth showing —
 * as quiet text on the identifier line, not a chip. Four outlined labels per
 * row read as a wall, and nothing inside a wall stands out.
 */
export const AdminWithOwners: Story = {
  args: { connections, ownerAccounts },
};

/** An owner id that no longer resolves to an account falls back to the raw id. */
export const UnresolvableOwner: Story = {
  args: {
    connections: [
      { ...connections[0], owner: "deleted-account" } as DataConnection,
    ],
    ownerAccounts: {},
  },
};

export const Empty: Story = {
  args: { connections: [] },
};
