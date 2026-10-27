import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductsFilters } from "./ProductsFilters";

/**
 * The filters above the product list. Search narrows by text as you type;
 * "Filter by tags" opens the known corpus of tags, and ticking one shows only
 * products that have every chosen tag. Each filter lives in the page's URL,
 * so a filtered list can be bookmarked or shared.
 */
const meta = {
  title: "Features/Products/ProductsFilters",
  component: ProductsFilters,
  parameters: { layout: "padded", nextjs: { appDirectory: true } },
  args: {
    tagOptions: ["acoustics", "bathymetry", "climate", "hls", "landsat"],
  },
} satisfies Meta<typeof ProductsFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No filters applied. */
export const Default: Story = {};

/** Filtered by two tags and a search, with the option to clear them all. */
export const Filtered: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/products",
        query: { tags: "climate,landsat", search: "surface" },
      },
    },
  },
};
