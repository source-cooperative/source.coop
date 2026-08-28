import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Flex } from "@radix-ui/themes";
import { DirectoryList } from "./DirectoryList";
import { BreadcrumbNav } from "@/components/display/BreadcrumbNav";
import {
  S3CredentialsProvider,
  UploadProvider,
} from "@/components/features/uploader";
import type { Product, ProductObject } from "@/types";

/**
 * The file tree on a product page.
 *
 * Every state below needs real objects behind the data proxy to see in the
 * app — a deep directory, a name long enough to wrap, an empty prefix, a
 * thousand rows going through the virtualizer. Here they are props.
 *
 * The list and its rows import no server action of their own; they use
 * `useUploadManager`, so the real upload providers wrap each story below.
 *
 * What kept this out of Storybook was not the uploader but a single line:
 * `logging.ts` used the CommonJS `__filename` global at module scope, so any
 * browser bundle reaching it threw before rendering. Fixed separately, which
 * is what this branch is stacked on.
 */
const meta = {
  title: "Object browser/DirectoryList",
  component: DirectoryList,
  parameters: { layout: "padded" },
  // The rows read upload progress from context, so the real providers wrap
  // every story -- the real ones, not stubs. Nothing here uploads, so no
  // credential is ever minted and `credentials` needs no mock.
  decorators: [
    (Story) => (
      <S3CredentialsProvider>
        <UploadProvider>
          <Story />
        </UploadProvider>
      </S3CredentialsProvider>
    ),
  ],
} satisfies Meta<typeof DirectoryList>;

export default meta;
type Story = StoryObj<typeof meta>;

const product = {
  account_id: "cascadia-research",
  product_id: "humpback-acoustics",
  title: "Humpback Acoustics",
  metadata: { tags: [], primary_mirror: "archive", mirrors: {} },
} as unknown as Product;

const object = (
  path: string,
  size: number,
  type: "file" | "directory" = "file"
): ProductObject =>
  ({
    id: path,
    product_id: "humpback-acoustics",
    path,
    size,
    type,
    created_at: "2026-03-12T00:00:00Z",
    updated_at: "2026-03-12T00:00:00Z",
    checksum: "d41d8cd98f00b204e9800998ecf8427e",
  }) as ProductObject;

/** Directories and files at the root of a product. */
export const Default: Story = {
  args: {
    product,
    prefix: "",
    objects: [
      object("recordings/", 0, "directory"),
      object("derived/", 0, "directory"),
      object("README.md", 2_140),
      object("manifest.json", 18_902),
      object("catalog.parquet", 48_204_112),
    ],
  },
};

/** Nested one level down. */
export const InADirectory: Story = {
  args: {
    product,
    prefix: "recordings/",
    objects: [
      object("recordings/2019/", 0, "directory"),
      object("recordings/2020/", 0, "directory"),
      object("recordings/site-a-20190712-0800.flac", 122_880_000),
      object("recordings/site-a-20190712-0900.flac", 121_453_312),
    ],
  },
};

/** An empty prefix, rather than a product with nothing in it. */
export const Empty: Story = {
  args: { product, objects: [], prefix: "recordings/2021/" },
};

/**
 * A name long enough to need truncating, beside a one-byte file and a
 * four-terabyte one — what the name and size columns have to survive together.
 */
export const AwkwardNames: Story = {
  args: {
    product,
    prefix: "",
    objects: [
      object(
        "site-a-hydrophone-array-continuous-passive-acoustic-monitoring-20190712T080000Z-to-20190712T090000Z.flac",
        122_880_000
      ),
      object("a.txt", 1),
      object("full-archive.tar", 4_398_046_511_104),
    ],
  },
};

/**
 * Past MAX_VISIBLE_ITEMS, so the virtualizer takes over. Worth scrolling: rows
 * are a fixed height and an uploading row is taller, which is where windowed
 * lists usually go wrong.
 */
export const Virtualized: Story = {
  args: {
    product,
    prefix: "recordings/",
    objects: Array.from({ length: 250 }, (_, i) =>
      object(
        `recordings/site-a-${String(i).padStart(4, "0")}.flac`,
        60_000_000 + i * 1_024
      )
    ),
  },
};

// A whole product's objects, flat, the way the listing API returns them.
// Directories carry a trailing slash; `childrenOf` slices one level out.
const tree: ProductObject[] = [
  object("recordings/", 0, "directory"),
  object("recordings/2019/", 0, "directory"),
  object("recordings/2019/site-a-20190712-0800.flac", 122_880_000),
  object("recordings/2019/site-a-20190712-0900.flac", 121_453_312),
  object("recordings/2020/", 0, "directory"),
  object("recordings/2020/site-b-20200103-1100.flac", 98_566_144),
  object("derived/", 0, "directory"),
  object("derived/spectrograms/", 0, "directory"),
  object("derived/spectrograms/site-a-20190712.png", 2_204_160),
  object("derived/detections.parquet", 8_412_672),
  object("README.md", 2_140),
  object("catalog.parquet", 48_204_112),
];

/** One level of `tree`, given a prefix — what the server returns per path. */
function childrenOf(objects: ProductObject[], prefix: string): ProductObject[] {
  return objects.filter((o) => {
    if (!o.path.startsWith(prefix) || o.path === prefix) return false;
    const rest = o.path.slice(prefix.length).replace(/\/$/, "");
    return !rest.includes("/");
  });
}

/**
 * Browsing, wired up.
 *
 * In the app a directory is a `<Link>` and the server re-fetches the listing
 * for the new URL. Storybook has no server and a mocked router, so clicks go
 * nowhere. This holds the prefix in state and intercepts clicks on links into
 * this product, which is a stand-in for the routing rather than the routing
 * itself — but it makes the thing you actually want to check, moving up and
 * down a tree with the breadcrumb keeping pace, reviewable here.
 */
function BrowsableTree({ product }: { product: Product }) {
  const [prefix, setPrefix] = useState("");
  const base = `/${product.account_id}/${product.product_id}`;
  const segments = prefix ? prefix.replace(/\/$/, "").split("/") : [];

  return (
    <Flex
      direction="column"
      gap="3"
      onClickCapture={(event) => {
        const link = (event.target as HTMLElement).closest("a");
        const href = link?.getAttribute("href");
        if (!href || !href.startsWith(base)) return;
        // A row's href carries the object path verbatim, so a directory
        // already ends in "/", while a breadcrumb's does not. Normalise before
        // comparing, or every directory click looks like an unknown path.
        const next = href
          .slice(base.length)
          .replace(/^\//, "")
          .replace(/\/$/, "");
        // Files have no listing to show, so only directories move the prefix.
        if (next && !tree.some((o) => o.path === `${next}/`)) return;
        event.preventDefault();
        setPrefix(next ? `${next}/` : "");
      }}
    >
      <BreadcrumbNav path={segments} baseUrl={base} />
      <DirectoryList
        product={product}
        objects={childrenOf(tree, prefix)}
        prefix={prefix}
      />
    </Flex>
  );
}

export const Browsable: Story = {
  args: { product, objects: [], prefix: "" },
  render: (args) => <BrowsableTree product={args.product} />,
};
