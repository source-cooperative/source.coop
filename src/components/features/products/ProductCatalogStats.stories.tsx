import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductCatalogStats } from "./ProductCatalogStats";

const meta = {
  title: "Features/Products/ProductCatalogStats",
  component: ProductCatalogStats,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProductCatalogStats>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    entry: {
      account_id: "example",
      product_id: "land-cover",
      total_bytes: 12345678900,
      object_count: 12500,
      exts: { tif: 10000, parquet: 2000, json: 400, csv: 100 },
      ext_bytes: { tif: 10000000000, parquet: 2000000000, json: 300000000, csv: 45678900 },
    },
  },
};

export const Missing: Story = {};
export const WithoutStatistics: Story = {
  args: { entry: { account_id: "example", product_id: "land-cover" } },
};
export const MissingByteCounts: Story = {
  args: { entry: { ...Default.args!.entry!, ext_bytes: undefined } },
};
export const EmptyDataset: Story = {
  args: { entry: { account_id: "example", product_id: "empty", object_count: 0, total_bytes: 0 } },
};
export const Mobile: Story = {
  ...Default,
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
