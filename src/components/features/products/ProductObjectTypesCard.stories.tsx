import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { ProductObjectTypesCardSkeleton } from "./ProductCatalogStats";
import { ProductObjectTypesCard } from "./ProductCatalogSummary";

/**
 * The Object types card in a product page's sidebar, between Details and
 * Analytics. It gives the product's byte volume and object count, a bar of its
 * object types by byte volume, and a table with each type's byte volume and
 * object count. The bar already shows each type's share of the bytes, so the
 * table gives the share of the objects, which can differ a lot.
 *
 * The three largest types each get a segment and a row, and everything else
 * is "other", so the card never needs more than four fills. Types are told
 * apart by shade and pattern, not color. Hovering a segment or a row
 * highlights both in green.
 *
 * The numbers come from the metadata catalog and cover the whole product,
 * whichever folder is open. A product the catalog has no statistics for shows
 * no card.
 */
const meta = {
  title: "Features/Product page/Object types/ProductObjectTypesCard",
  component: ProductObjectTypesCard,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProductObjectTypesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Most of the byte volume is GeoTIFF, but most of the objects are small JSON
 * sidecars: the table shows both at once.
 */
export const Default: Story = {
  args: {
    entry: {
      account_id: "example",
      product_id: "land-cover",
      total_bytes: 12_345_678_900,
      object_count: 12_500,
      exts: { tif: 2_000, parquet: 400, json: 10_000, csv: 100 },
      ext_bytes: { tif: 10_000_000_000, parquet: 2_000_000_000, json: 300_000_000, csv: 45_678_900 },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img")).toHaveAccessibleName(
      expect.stringMatching(/^Object types by byte volume: tif/),
    );
    const json = canvas.getByRole("rowheader", { name: "json" }).closest("tr")!;
    await expect(json).toHaveTextContent("10K");
    await expect(json).toHaveTextContent("80%");
  },
};

/** A Zarr store, whose chunk objects have no extension. */
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

/**
 * A product with tens of millions of objects. Counts are compact (22.9M) so
 * the table stays readable in a narrow sidebar; hovering a count shows the
 * exact figure.
 */
export const ManyObjects: Story = {
  args: {
    entry: {
      account_id: "example",
      product_id: "archive",
      total_bytes: 39_098_406_243_164,
      object_count: 22_862_797,
      exts: { "": 22_862_795, json: 2 },
      ext_bytes: { "": 39_098_406_243_094, json: 70 },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = canvas.getByRole("rowheader", { name: "no extension" }).closest("tr")!;
    await expect(row).toHaveTextContent("22.9M");
    await expect(canvas.getByTitle("22,862,795")).toBeInTheDocument();
  },
};

/**
 * Without a byte breakdown the bar measures object counts, and the table's
 * bytes column shows a dash.
 */
export const CountsOnly: Story = {
  args: { entry: { ...Default.args!.entry!, ext_bytes: undefined } },
};

/** Totals without a breakdown by type: the stats alone. */
export const TotalsOnly: Story = {
  args: {
    entry: { account_id: "example", product_id: "land-cover", total_bytes: 52_428_800, object_count: 3 },
  },
};

/**
 * What the sidebar shows in the card's place while the product page loads,
 * so the Analytics card below doesn't jump when it arrives.
 */
export const Loading: Story = {
  render: () => <ProductObjectTypesCardSkeleton />,
};

/** The product page's sidebar is dark for many viewers. */
export const Dark: Story = {
  ...Default,
  play: undefined,
  globals: { appearance: "dark" },
};

/** On a phone the sidebar stacks under the contents at full width. */
export const Mobile: Story = {
  ...Default,
  play: undefined,
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
