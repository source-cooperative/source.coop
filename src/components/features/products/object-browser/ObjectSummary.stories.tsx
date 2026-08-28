import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ObjectSummary } from "./ObjectSummary";
import {
  DataProvider,
  type DataConnection,
  type Product,
  type ProductObject,
} from "@/types";

/**
 * The detail panel for one object: name, size, content type, when it changed,
 * where it lives, and a download.
 *
 * Two rows are conditional and neither is easy to produce on demand in the app.
 * **Cloud URI** appears only when the object's connection is known, and its
 * scheme depends on the provider — `s3://bucket/…` against S3, an
 * `https://account.blob.core.windows.net/…` URL against Azure, and nothing at
 * all for GCS. **Checksum** appears only when the object carries a `sha256`,
 * and brings a verifier that streams the file to check it.
 *
 * That verifier is live: pressing it fetches the object, which in Storybook
 * fails. The button and its states are what this shows, not a passing check.
 */
const meta = {
  title: "Object browser/ObjectSummary",
  component: ObjectSummary,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ObjectSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

const product = {
  account_id: "cascadia-research",
  product_id: "humpback-acoustics",
  title: "Humpback Acoustics",
  account: {
    account_id: "cascadia-research",
    name: "Cascadia Research",
    type: "organization",
  },
  metadata: { tags: [], primary_mirror: "archive", mirrors: {} },
} as unknown as Product;

const objectInfo = {
  id: "recordings/2019/site-a-20190712-0800.flac",
  product_id: "humpback-acoustics",
  path: "recordings/2019/site-a-20190712-0800.flac",
  size: 122_880_000,
  type: "file",
  mime_type: "audio/flac",
  created_at: "2026-03-12T09:41:00Z",
  updated_at: "2026-03-12T09:41:00Z",
  checksum: "d41d8cd98f00b204e9800998ecf8427e",
} as ProductObject;

const s3Connection = {
  primaryMirror: { connection_id: "cascadia-archive", prefix: "humpback/", is_primary: true },
  dataConnection: {
    data_connection_id: "cascadia-archive",
    name: "Cascadia Archive",
    details: {
      provider: DataProvider.S3,
      bucket: "cascadia-archive",
      base_prefix: "",
      region: "us-west-2",
    },
  } as unknown as DataConnection,
};

/** No connection resolved, no checksum recorded: the rows that always exist. */
export const Default: Story = {
  args: { product, objectInfo },
};

/** On S3, so the Cloud URI is an `s3://` address under the mirror's prefix. */
export const OnS3: Story = {
  // Storybook title-cases the export name, which turns OnS3 into "On S 3".
  name: "On S3",
  args: { product, objectInfo, connectionDetails: s3Connection },
};

/**
 * On Azure the same row is an HTTPS blob URL built from the storage account
 * and container — a different shape, not a different scheme prefix.
 */
export const OnAzure: Story = {
  name: "On Azure",
  args: {
    product,
    objectInfo,
    connectionDetails: {
      primaryMirror: { connection_id: "azure-open-data", prefix: "humpback/", is_primary: true },
      dataConnection: {
        data_connection_id: "azure-open-data",
        name: "[PROD] Azure Open Data (West Europe)",
        details: {
          provider: DataProvider.Azure,
          account_name: "opendatastore",
          container_name: "westeurope",
          base_prefix: "",
          region: "westeurope",
        },
      } as unknown as DataConnection,
    },
  },
};

/** GCS resolves no Cloud URI, so that row is absent rather than blank. */
export const OnGoogleCloud: Story = {
  name: "On Google Cloud",
  args: {
    product,
    objectInfo,
    connectionDetails: {
      primaryMirror: { connection_id: "rle-files", prefix: "", is_primary: true },
      dataConnection: {
        data_connection_id: "rle-files",
        name: "RLE Assessment Files",
        details: {
          provider: DataProvider.GCS,
          bucket: "rle-files",
          base_prefix: "",
        },
      } as unknown as DataConnection,
    },
  },
};

/** With a recorded sha256, the checksum row and its verifier appear. */
export const WithChecksum: Story = {
  args: {
    product,
    connectionDetails: s3Connection,
    objectInfo: {
      ...objectInfo,
      metadata: {
        sha256:
          "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      },
    } as ProductObject,
  },
};

/** A tiny text file rather than a large binary — different size and type. */
export const SmallTextFile: Story = {
  args: {
    product,
    connectionDetails: s3Connection,
    objectInfo: {
      ...objectInfo,
      path: "README.md",
      size: 2_140,
      mime_type: "text/markdown",
    } as ProductObject,
  },
};
