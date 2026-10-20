import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { ProductFileTypesCardSkeleton } from "./ProductCatalogStats";
import { ProductFileTypesCard } from "./ProductCatalogSummary";

/**
 * The File types card in a product page's sidebar, between Details and
 * Analytics. It gives the product's total size and file count, then breaks
 * the files down by type — by size, or by file count with the toggle.
 *
 * The three largest types each get a segment and a row, and everything else
 * is "other", so the card never needs more than four fills. Types are told
 * apart by shade and pattern, not color.
 *
 * The numbers come from the metadata catalog and cover the whole product,
 * whichever folder is open. A product the catalog has no statistics for shows
 * no card.
 */
const meta = {
  title: "Features/Product page/File types/ProductFileTypesCard",
  component: ProductFileTypesCard,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProductFileTypesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Most of the size is GeoTIFF, but most of the files are small JSON
 * sidecars — switch to Count to see the order change.
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
      expect.stringMatching(/^File types by size: tif/),
    );
    await userEvent.click(canvas.getByRole("radio", { name: "Count" }));
    await expect(canvas.getByRole("img")).toHaveAccessibleName(
      expect.stringMatching(/^File types by file count: json/),
    );
    await userEvent.click(canvas.getByRole("radio", { name: "Size" }));
  },
};

/** A Zarr store, whose chunk files have no extension. */
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
 * Without a byte breakdown the card opens on file counts. Size still works,
 * but has nothing to show beyond the total.
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
  render: () => <ProductFileTypesCardSkeleton />,
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
