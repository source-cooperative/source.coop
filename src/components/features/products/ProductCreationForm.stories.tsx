import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductCreationForm } from "./ProductCreationForm";
import {
  type Account,
  type DataConnection,
  DataProvider,
  type Product,
  ProductVisibility,
} from "@/types";

/**
 * Creating a product, and the same form in edit mode.
 *
 * The interesting axis is what the viewer can own it as: with one account there
 * is nothing to choose, with several the owner becomes a real decision, and the
 * storage picker only offers connections they may create against.
 *
 * `createProduct` and `updateProduct` are `fn()` stubs, so submitting does
 * nothing.
 */
const meta = {
  title: "Features/Products/ProductCreationForm",
  component: ProductCreationForm,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProductCreationForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const individual = {
  account_id: "cholmes",
  name: "Chris Holmes",
  type: "individual",
} as unknown as Account;

const organization = {
  account_id: "cascadia-research",
  name: "Cascadia Research",
  type: "organization",
} as unknown as Account;

const dataConnections = [
  {
    data_connection_id: "cascadia-archive",
    name: "Cascadia Archive",
    read_only: false,
    allowed_visibilities: [ProductVisibility.Public, ProductVisibility.Unlisted],
    details: {
      provider: DataProvider.S3,
      bucket: "cascadia-archive",
      base_prefix: "",
      region: "us-west-2",
    },
  },
  {
    data_connection_id: "aws-opendata-us-west-2",
    name: "[PROD] AWS Open Data (US-West-2)",
    read_only: true,
    allowed_visibilities: [ProductVisibility.Public],
    details: {
      provider: DataProvider.S3,
      bucket: "aws-opendata-us-west-2",
      base_prefix: "",
      region: "us-west-2",
    },
  },
] as unknown as DataConnection[];

/** One possible owner, so there is no owner decision to make. */
export const Create: Story = {
  args: {
    potentialOwnerAccounts: [individual],
    dataConnections,
  },
};

/** Several owners: the choice appears, and the preselection comes from ?owner=. */
export const ChoosingAnOwner: Story = {
  args: {
    potentialOwnerAccounts: [individual, organization],
    dataConnections,
    defaultOwnerId: "cascadia-research",
  },
};

/** No storage available to this account yet. */
export const NoConnections: Story = {
  args: {
    potentialOwnerAccounts: [individual],
    dataConnections: [],
  },
};

export const Edit: Story = {
  args: {
    mode: "edit",
    potentialOwnerAccounts: [organization],
    dataConnections,
    product: {
      account_id: "cascadia-research",
      product_id: "humpback-acoustics",
      title: "Humpback Acoustics",
      description: "Passive acoustic monitoring of humpback whales.",
      visibility: ProductVisibility.Public,
      disabled: false,
      metadata: {
        tags: ["acoustics", "cetaceans"],
        primary_mirror: "archive",
        mirrors: {
          archive: { connection_id: "cascadia-archive", prefix: "" },
        },
      },
    } as unknown as Product,
  },
};
