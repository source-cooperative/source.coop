import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { ProductVisibility, type Product } from "@/types";
import { ProductListItem } from "./ProductListItem";

const product: Product = {
  account_id: "acoltrane",
  product_id: "universal-consciousness",
  title: "Universal Consciousness - Global Field Boundaries, 2nd Edition",
  description:
    "Universal Consciousness - 2nd Edition provides updated global-scale estimates of agricultural fields for 2017-2025. The model runs on the [Journey in Satchidananda Quarterly Mosaics](https://example.org/satchidananda/mosaics) from [Impulse!](https://example.org/impulse) rehosted by the Arkestra on Source Cooperative [here](https://example.org/arkestra/mosaics). The product contains raw prediction COGs, vectorized GeoParquet, and PMTiles for visualization.\n\nThis product is sponsored and developed by [Sun Ra Arkestra](https://example.org/arkestra) in partnership with the [Ptah Collective](https://example.org/ptah) and its partners.",
  created_at: "2026-09-27T12:00:00Z",
  updated_at: "2026-09-27T12:00:00Z",
  visibility: ProductVisibility.Unlisted,
  metadata: { mirrors: {}, primary_mirror: "" },
  disabled: false,
  featured: 0,
};

/**
 * Product summaries display a description's inline Markdown — paragraphs,
 * emphasis, lists and inline code — clamped to three lines. Headings, tables,
 * code blocks and links render as plain text: a listing links only to the
 * product and its publisher, and the full description is on the product page.
 */
const meta = {
  title: "Features/Products/ProductListItem",
  component: ProductListItem,
  args: { product },
} satisfies Meta<typeof ProductListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A product whose sources and partners are linked on its product page. */
export const MarkdownDescription: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("link", { name: "Sun Ra Arkestra" }))
      .not.toBeInTheDocument();
    await expect(canvasElement).toHaveTextContent("Sun Ra Arkestra");
    await expect(canvas.getByRole("link", { name: product.title }))
      .toHaveAttribute("href", "/acoltrane/universal-consciousness");
    await expect(canvasElement.querySelectorAll("article p"))
      .toHaveLength(2);
    await expect(canvasElement).not.toHaveTextContent("[Impulse!]");
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

/** Emphasis, lists and inline code keep their formatting. */
export const Formatting: Story = {
  args: {
    product: {
      ...product,
      description: "**Field boundaries** with *global coverage*.\n\n- Predictions in `COG` format\n- Vectors in GeoParquet",
    },
  },
};

/**
 * A description holding a whole README: headings, fenced code, a table and
 * bare URLs. Its headings and code blocks read as plain text, and the
 * description stops after three lines.
 */
export const ReadmeDescription: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("heading")).toHaveLength(1);
    await expect(canvas.getAllByRole("link")).toHaveLength(1);
    await expect(canvasElement.querySelector("article pre, article table"))
      .toBeNull();
    const description = canvas.getByText(/Modal-compressed/).closest("div")!;
    await expect(description.scrollHeight).toBeGreaterThan(
      description.clientHeight
    );
  },
  args: {
    product: {
      ...product,
      account_id: "mdavis",
      product_id: "kind-of-blue",
      title: "Kind of Blue: Gap-free 20 m 5-Day Leaf Area Index, 1959–1964",
      description: `# Kind of Blue

Modal-compressed version of **So What-LS20**, a gap-free, 20 m, 5-day leaf
area index product derived from integrated Landsat and Sentinel-2 data.

Files are stored as \`.modal\` instead of GeoTIFF to reduce size. **A decoder
is required to read them.**

## Decode

\`\`\`bash
pip install pymodal
\`\`\`

Documentation: https://example.org/mdavis/pymodal

### Minimal example

\`\`\`python
import pymodal

data = pymodal.read("KindOfBlue_n040w074_1959_v01_LAI.modal")
print(data.shape)  # (73, rows, cols)
\`\`\`

> Note: decoded values are already physical. Do **not** apply scale factors.

## Physical values & ranges

| Variable | Range | Unit |
|----------|-------|------|
| LAI      | 0 – 10.0 | m² m⁻² |
| FAPAR    | 0 – 1.0  | unitless |

## Citation

Davis, M., J. Coltrane, and B. Evans (1959). "Kind of Blue." *Columbia*, 1, 8163.

## Contact

- Original product: Cannonball Adderley
- Decoder: Paul Chambers
`,
    },
  },
};
