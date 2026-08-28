import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductMirrorsManager } from "./ProductMirrorsManager";
import type { Product } from "@/types";

/**
 * The storage a product mirrors to, and the controls for changing it.
 *
 * This is the other half of the pair #504 normalized: it and
 * `DataConnectionsList` render the same entity, so they share `ConnectionRow`
 * and must not drift. Until the mirror actions were mocked only one of the two
 * had a story, which made "they look like the same thing" a claim you had to
 * take on trust. Put this beside **Data connections/DataConnectionsList**.
 *
 * It is also why the product list could not become a table: the inline prefix
 * editor, the overflow menu and the per-row result message do not fit a cell.
 *
 * Submitting does nothing — the four mirror actions are `fn()` stubs.
 */
const meta = {
  title: "Data connections/ProductMirrorsManager",
  component: ProductMirrorsManager,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProductMirrorsManager>;

export default meta;
type Story = StoryObj<typeof meta>;

// Cast at the boundary: the manager reads the mirror map and a couple of ids.
const product = {
  account_id: "miskatonic",
  product_id: "abyssal-acoustics",
  title: "Abyssal Acoustics",
  metadata: {
    tags: [],
    primary_mirror: "archive",
    mirrors: {
      archive: {
        connection_id: "miskatonic-archive",
        prefix: "abyssal-acoustics/",
      },
      opendata: {
        connection_id: "aws-opendata-us-west-2",
        prefix: "miskatonic/abyssal-acoustics/",
      },
    },
  },
} as unknown as Product;

const connectionInfo = {
  "miskatonic-archive": {
    name: "Miskatonic Archive",
    bucket: "miskatonic-archive",
    provider: "s3",
  },
  "aws-opendata-us-west-2": {
    name: "[PROD] AWS Open Data (US-West-2)",
    bucket: "aws-opendata-us-west-2",
    provider: "s3",
  },
};

const availableConnections = [
  {
    data_connection_id: "black-mesa-files",
    name: "Black Mesa Survey Files",
    provider: "gcs",
    bucket: "black-mesa-files",
    read_only: true,
  },
] as unknown as React.ComponentProps<
  typeof ProductMirrorsManager
>["availableConnections"];

const base = {
  product,
  availableConnections,
  connectionInfo,
  canManageMirrors: true,
  isAdmin: false,
  ownedConnectionIds: ["miskatonic-archive"],
  editablePrefixConnectionIds: ["miskatonic-archive"],
};

/** Two mirrors, one of them primary, with the prefix editable on the owned one. */
export const Default: Story = {
  args: base,
};

/**
 * A product-scoped maintainer: they reach this page but may not change which
 * storage the account's product mirrors to, so the controls go away and the
 * rows stay.
 */
export const ReadOnlyViewer: Story = {
  args: {
    ...base,
    canManageMirrors: false,
    editablePrefixConnectionIds: [],
  },
};

/** An admin also gets the /admin edit link for system-level connections. */
export const AsAdmin: Story = {
  args: { ...base, isAdmin: true },
};

/**
 * The prefix is read-only unless the viewer manages both the account and the
 * connection — the common case for a system connection they merely use.
 */
export const PrefixNotEditable: Story = {
  args: { ...base, editablePrefixConnectionIds: [] },
};

/** Nothing mirrored yet. */
export const NoMirrors: Story = {
  args: {
    ...base,
    product: {
      ...product,
      metadata: { tags: [], primary_mirror: "", mirrors: {} },
    } as unknown as Product,
  },
};
