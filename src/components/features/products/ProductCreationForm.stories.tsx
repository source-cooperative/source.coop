import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
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
  title: "Features/Settings/Products/ProductCreationForm",
  component: ProductCreationForm,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProductCreationForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const individual = {
  account_id: "acoltrane",
  name: "Alice Coltrane",
  type: "individual",
} as unknown as Account;

const organization = {
  account_id: "miskatonic",
  name: "Miskatonic University",
  type: "organization",
} as unknown as Account;

const dataConnections = [
  {
    data_connection_id: "miskatonic-archive",
    name: "Miskatonic Archive",
    // Owned: only Miskatonic University's products may use it, so it drops out
    // of the picker when the owner switches to an individual.
    owner: "miskatonic",
    read_only: false,
    allowed_visibilities: [ProductVisibility.Public, ProductVisibility.Unlisted],
    details: {
      provider: DataProvider.S3,
      bucket: "miskatonic-archive",
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

/**
 * One possible owner, so there is no owner decision to make — and only the
 * unowned shared connection is on offer.
 */
export const Create: Story = {
  args: {
    potentialOwnerAccounts: [individual],
    dataConnections,
  },
};

/**
 * Several owners: the choice appears, and the preselection comes from ?owner=.
 * Switching the owner to Alice Coltrane drops Miskatonic Archive from the storage
 * picker, since Miskatonic University owns it.
 */
export const ChoosingAnOwner: Story = {
  args: {
    potentialOwnerAccounts: [individual, organization],
    dataConnections,
    defaultOwnerId: "miskatonic",
  },
};

/**
 * An ID another product already holds, even one the viewer may not see: the
 * availability check calls any product that exists "not available". Here the
 * check is answered with a 403, as it is for a restricted product.
 */
export const IdTaken: Story = {
  args: {
    potentialOwnerAccounts: [individual],
    dataConnections,
  },
  beforeEach: () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) =>
      init?.method === "HEAD" ? new Response(null, { status: 403 }) : realFetch(input, init);
    return () => {
      globalThis.fetch = realFetch;
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/Product ID/), "abyssal-acoustics");
    await canvas.findByText(/Product ID is not available/, {}, { timeout: 3000 });
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
      account_id: "miskatonic",
      product_id: "abyssal-acoustics",
      title: "Abyssal Acoustics",
      description: "Passive acoustic monitoring of deep-ocean soundscapes.",
      visibility: ProductVisibility.Public,
      disabled: false,
      metadata: {
        tags: ["acoustics", "cetaceans"],
        primary_mirror: "archive",
        mirrors: {
          archive: { connection_id: "miskatonic-archive", prefix: "" },
        },
      },
    } as unknown as Product,
  },
};
