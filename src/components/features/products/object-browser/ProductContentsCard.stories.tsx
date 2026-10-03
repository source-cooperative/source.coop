import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductContentsCard } from "./ProductContentsCard";
import { DirectoryList } from "./DirectoryList";
import {
  S3CredentialsProvider,
  UploadProvider,
} from "@/components/features/uploader";
import type { Product, ProductObject } from "@/types";

/**
 * The Contents card on a product page: the object listing at the current
 * path, with a breadcrumb back up the tree and, in the header, the controls
 * for it.
 *
 * The refresh icon reloads the listing at the current path, which picks up
 * objects added or removed elsewhere — from the CLI, say — without reloading
 * the page. Anyone who can write to the product also gets the lock, which
 * switches the card into edit mode for uploads.
 */
const meta = {
  title: "Features/Object browser/ProductContentsCard",
  component: ProductContentsCard,
  parameters: { layout: "padded" },
  // The lock and the rows read credentials and upload progress from context,
  // so the real providers wrap every story.
  decorators: [
    (Story) => (
      <S3CredentialsProvider>
        <UploadProvider>
          <Story />
        </UploadProvider>
      </S3CredentialsProvider>
    ),
  ],
} satisfies Meta<typeof ProductContentsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const product = {
  account_id: "miskatonic",
  product_id: "abyssal-acoustics",
  title: "Abyssal Acoustics",
  metadata: { tags: [], primary_mirror: "archive", mirrors: {} },
} as unknown as Product;

const object = (
  path: string,
  size: number,
  type: "file" | "directory" = "file"
): ProductObject =>
  ({
    id: path,
    product_id: "abyssal-acoustics",
    path,
    size,
    type,
    created_at: "2026-03-12T00:00:00Z",
    updated_at: "2026-03-12T00:00:00Z",
    checksum: "d41d8cd98f00b204e9800998ecf8427e",
  }) as ProductObject;

const prefix = "recordings/";

const listing = (
  <DirectoryList
    product={product}
    prefix={prefix}
    objects={[
      object("recordings/2019/", 0, "directory"),
      object("recordings/2020/", 0, "directory"),
      object("recordings/site-a-20190712-0800.flac", 122_880_000),
      object("recordings/site-a-20190712-0900.flac", 121_453_312),
    ]}
  />
);

/** What most visitors see: the listing and the refresh icon. */
export const ReadOnly: Story = {
  args: {
    accountId: product.account_id,
    productId: product.product_id,
    path: ["recordings"],
    prefix,
    canWriteData: false,
    children: listing,
  },
};

/** Someone who can write to the product, with the lock beside the refresh. */
export const CanWrite: Story = {
  args: { ...ReadOnly.args, canWriteData: true },
};
