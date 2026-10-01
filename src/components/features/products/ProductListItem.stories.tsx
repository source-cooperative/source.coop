import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { ProductVisibility, type Product } from "@/types";
import { ProductListItem } from "./ProductListItem";

const product: Product = {
  account_id: "ftw",
  product_id: "global-data-beta",
  title: "Global Fields of The World (FTW) - 2nd Edition",
  description:
    "The Global Fields of The World - 2nd Edition release provides updated global-scale estimates of agricultural fields for 2017-2025. The dataset is run on the [Sentinel-2 Level 3 Quarterly Cloudless Mosaics](https://documentation.dataspace.copernicus.eu/Data/SentinelMissions/Sentinel2.html#sentinel-2-level-3-quarterly-mosaics) from [CDSE](https://dataspace.copernicus.eu/) rehosted by Taylor Geospatial on Source Cooperative [here](https://source.coop/tge-labs/sentinel-2-quarterly-cloudless-mosaics). The data product contains raw prediction COGs, vectorized GeoParquet, and PMTiles for visualization.\n\nThis product is sponsored and developed by [Taylor Geospatial](https://taylorgeospatial.org/) in partnership with the [FTW organization](https://fieldsofthe.world/) and its partners.",
  created_at: "2026-09-27T12:00:00Z",
  updated_at: "2026-09-27T12:00:00Z",
  visibility: ProductVisibility.Unlisted,
  metadata: { mirrors: {}, primary_mirror: "" },
  disabled: false,
  featured: 0,
};

/**
 * Product summaries display Markdown descriptions with their formatting and
 * paragraphs. Links in a description render as plain text: a listing links only
 * to the product and its publisher, and the description's links are on the
 * product page.
 */
const meta = {
  title: "Features/Products/ProductListItem",
  component: ProductListItem,
  args: { product },
} satisfies Meta<typeof ProductListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An organization product whose sources and partners are linked on its product page. */
export const MarkdownDescription: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("link", { name: "Taylor Geospatial" }))
      .not.toBeInTheDocument();
    await expect(canvasElement).toHaveTextContent("Taylor Geospatial");
    await expect(canvas.getByRole("link", { name: product.title }))
      .toHaveAttribute("href", "/ftw/global-data-beta");
    await expect(canvasElement.querySelectorAll(".markdown-viewer p"))
      .toHaveLength(2);
    await expect(canvasElement).not.toHaveTextContent("[CDSE]");
  },
};

/** Paragraphs wrap within the card at phone width. */
export const Narrow: Story = {
  ...MarkdownDescription,
  globals: { viewport: { value: "mobile1", isRotated: false } },
};

/** Plain descriptions remain readable without Markdown syntax. */
export const PlainText: Story = {
  args: { product: { ...product, description: "Global agricultural field boundaries." } },
};

/** Products can omit their description. */
export const WithoutDescription: Story = {
  args: { product: { ...product, description: "" } },
};

/** Emphasis, lists, and inline code use the product page's Markdown styling. */
export const Formatting: Story = {
  args: {
    product: {
      ...product,
      description: "**Field boundaries** with *global coverage*.\n\n- Predictions in `COG` format\n- Vectors in GeoParquet",
    },
  },
};
