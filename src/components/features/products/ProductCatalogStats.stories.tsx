import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductCatalogStats } from "./ProductCatalogStats";

/**
 * The object-type row at the foot of a product's card in an organization's
 * product list: total size and object count, a slim bar of the product's
 * largest object types by size, and a legend.
 *
 * Object types are told apart by shade and pattern, not color. The bar shows
 * the three largest types and folds the rest into "other", so it never needs
 * more than four fills. Hovering a segment names its type and size.
 *
 * The numbers come from the metadata catalog and cover the whole product, in
 * every folder. A product the catalog has no statistics for shows no row.
 */
const meta = {
  title: "Features/Product listing/ProductCatalogStats",
  component: ProductCatalogStats,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProductCatalogStats>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A product with more object types than the bar shows. */
export const Default: Story = {
  args: {
    entry: {
      account_id: "example",
      product_id: "land-cover",
      total_bytes: 12_345_678_900,
      object_count: 12_500,
      exts: { tif: 10_000, parquet: 2_000, json: 400, csv: 100 },
      ext_bytes: { tif: 10_000_000_000, parquet: 2_000_000_000, json: 300_000_000, csv: 45_678_900 },
    },
  },
};

/**
 * A Zarr store: nearly every object is a chunk with no extension, so one
 * segment fills most of the bar.
 */
export const NoExtension: Story = {
  args: {
    entry: {
      account_id: "example",
      product_id: "smoke.zarr",
      total_bytes: 687_194_767_360,
      object_count: 1_204_557,
      exts: { "": 1_204_100, json: 450, md: 7 },
      ext_bytes: { "": 666_000_000_000, json: 14_000_000_000, md: 7_194_767_360 },
    },
  },
};

/** Without a byte breakdown, the bar measures object counts instead. */
export const CountsOnly: Story = {
  args: { entry: { ...Default.args!.entry!, ext_bytes: undefined } },
};

/** The catalog has totals but no breakdown by type: no bar, totals only. */
export const TotalsOnly: Story = {
  args: {
    entry: { account_id: "example", product_id: "empty", object_count: 0, total_bytes: 0 },
  },
};

/** The fills come from the theme's grays, so they hold up in dark mode. */
export const Dark: Story = {
  ...Default,
  globals: { appearance: "dark" },
};
