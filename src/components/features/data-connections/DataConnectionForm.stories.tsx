import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DataConnectionForm } from "./DataConnectionForm";
import type { EditableDataConnection } from "./redact";
import {
  DataConnectionAuthenticationType,
  DataProvider,
  ProductVisibility,
} from "@/types";

/**
 * The whole connection form: Identity, Backend, Key layout, Authentication,
 * Policy.
 *
 * This story exists because of `sb.mock()` in `.storybook/preview.tsx`. The
 * form imports its submit actions from a `"use server"` module, which drags the
 * AWS SDK into the browser bundle and throws `__filename is not defined` on
 * render — so until the module was redirected to its `__mocks__` sibling, the
 * largest form in the app was the one thing the Storybook could not show.
 *
 * Submitting does nothing here: the actions are `fn()` stubs that resolve to an
 * idle form state. What this is good for is the layout and the branching —
 * which fields each provider and each auth method swaps in, and what a stored
 * credential looks like next to one that was never set.
 */
const meta = {
  title: "Features/Data connections/DataConnectionForm",
  component: DataConnectionForm,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DataConnectionForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// Cast at the boundary: the form reads a handful of fields, and a valid
// DataConnection here would be pages of scaffolding.
const s3Connection = {
  data_connection_id: "miskatonic--miskatonic-archive",
  name: "Miskatonic Archive",
  read_only: false,
  allowed_visibilities: [ProductVisibility.Public, ProductVisibility.Unlisted],
  prefix_template: "{{repository.account_id}}/{{repository.repository_id}}/",
  details: {
    provider: DataProvider.S3,
    bucket: "miskatonic-archive",
    base_prefix: "",
    region: "us-west-2",
  },
  authentication: {
    type: DataConnectionAuthenticationType.S3AccessKey,
    access_key_id: "AKIA3XV7QZEXAMPLE",
  },
} as unknown as EditableDataConnection;

/** Nothing filled in. The id is derived from the name as you type it. */
export const Create: Story = {
  args: { mode: "create" },
};

/**
 * Editing an S3 connection with a key already stored — the state the form was
 * rebuilt for. The secret says "Stored" rather than showing an empty password
 * box, and the worked example under Key layout resolves the whole location.
 */
export const EditWithStoredKey: Story = {
  args: { mode: "edit", dataConnection: s3Connection },
};

/**
 * Google Cloud federates without a key, so the Authentication section swaps to
 * workload identity and the Backend section loses its region.
 */
export const GoogleCloud: Story = {
  args: {
    mode: "edit",
    dataConnection: {
      ...s3Connection,
      name: "Black Mesa Survey Files",
      details: {
        provider: DataProvider.GCS,
        bucket: "black-mesa-files",
        base_prefix: "",
      },
      authentication: {
        type: DataConnectionAuthenticationType.GcpWorkloadIdentity,
        workload_identity_provider:
          "//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/source/providers/source",
        service_account: "source-reader@example.iam.gserviceaccount.com",
      },
    } as unknown as EditableDataConnection,
  },
};

/**
 * Azure addresses a container inside a storage account, so Backend asks for
 * both where the others ask for one bucket.
 */
export const Azure: Story = {
  args: {
    mode: "edit",
    dataConnection: {
      ...s3Connection,
      name: "[PROD] Azure Open Data (West Europe)",
      details: {
        provider: DataProvider.Azure,
        account_name: "opendatastore",
        container_name: "westeurope",
        base_prefix: "",
        region: "westeurope",
      },
      authentication: {
        type: DataConnectionAuthenticationType.AzureSasToken,
      },
    } as unknown as EditableDataConnection,
  },
};

/**
 * Scoped to an account rather than the platform. The owner is posted as a
 * hidden field and the platform-only Required Flag disappears from Policy.
 */
export const AccountOwned: Story = {
  args: {
    mode: "edit",
    ownerAccountId: "miskatonic",
    dataConnection: s3Connection,
  },
};
