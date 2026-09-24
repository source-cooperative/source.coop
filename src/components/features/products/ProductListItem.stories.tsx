import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductVisibility } from "@/types";
import { ProductListItem } from "./ProductListItem";

const meta = {
  title: "Features/Products/ProductListItem",
  component: ProductListItem,
  parameters: { layout: "padded" },
  args: {
    product: {
      account_id: "example",
      product_id: "land-cover",
      title: "Global land cover",
      description: "Annual land cover observations for research and analysis.",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      visibility: ProductVisibility.Public,
      disabled: false,
      featured: 0,
      metadata: { mirrors: {}, primary_mirror: "", tags: ["land cover"] },
    },
  },
} satisfies Meta<typeof ProductListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCatalog: Story = {
  args: {
    catalogEntry: {
      account_id: "example",
      product_id: "land-cover",
      total_bytes: 12345678900,
      object_count: 12500,
      exts: { tif: 10000, parquet: 2000, json: 400, csv: 100 },
    },
  },
};

export const LongDescription: Story = {
  args: {
    ...WithCatalog.args,
    product: {
      ...meta.args.product,
      description:
        "Annual land cover observations for research and analysis, including regional classifications, validation samples, and supporting documentation. Data is available in several formats for use in desktop GIS and cloud-based workflows.",
    },
  },
};

export const WithoutCatalog: Story = {};
export const Mobile: Story = {
  ...WithCatalog,
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
export const EmptyDataset: Story = {
  args: {
    catalogEntry: {
      account_id: "example",
      product_id: "land-cover",
      total_bytes: 0,
      object_count: 0,
    },
  },
};
