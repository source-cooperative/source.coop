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
  title: "Features/Settings/Data connections/DataConnectionForm",
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
    type: DataConnectionAuthenticationType.S3WebIdentityRole,
    role_arn: "arn:aws:iam::123456789012:role/source-cooperative-proxy",
  },
} as unknown as EditableDataConnection;

/** Nothing filled in. The id is derived from the name as you type it. */
export const Create: Story = {
  args: { mode: "create" },
};

/**
 * Editing a connection saved with an access key, a type the data proxy doesn't
 * sign requests with. The type stays selected and is marked as no longer
 * offered, so the rest of the connection can be edited without replacing it.
 * Once another type is picked, it can't be chosen again. The secret says
 * "Stored" rather than showing an empty password box.
 */
export const RetiredAccessKey: Story = {
  args: {
    mode: "edit",
    dataConnection: {
      ...s3Connection,
      authentication: {
        type: DataConnectionAuthenticationType.S3AccessKey,
        access_key_id: "AKIA3XV7QZEXAMPLE",
      },
    } as unknown as EditableDataConnection,
  },
};

/**
 * Google Cloud buckets are read unsigned, so Authentication offers only None
 * and the Backend section loses its region.
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
      read_only: true,
      authentication: undefined,
    } as unknown as EditableDataConnection,
  },
};

/**
 * Azure addresses a container inside a storage account, so Backend asks for
 * both where the others ask for one bucket. Like Google Cloud, it is read
 * unsigned.
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
      read_only: true,
      authentication: undefined,
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

/**
 * Keyless S3 access: the proxy assumes your IAM role with its own OIDC token,
 * so nothing secret is stored. Below the role ARN is the trust policy to give
 * that role, filled in with its AWS account and this connection's id. It admits
 * this connection alone; a role that trusts the proxy without it can be
 * assumed by any connection on Source Cooperative.
 */
export const WebIdentityRole: Story = {
  args: {
    mode: "edit",
    ownerAccountId: "miskatonic",
    proxyOrigin: "https://data.source.coop",
    dataConnection: s3Connection,
  },
};
