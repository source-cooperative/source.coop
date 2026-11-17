import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { ProductVisibility, type Product } from "@/types";
import { ProductMetaCard } from "./ProductMetaCard";

/**
 * The Details card in a product page's sidebar: visibility, owner, when the
 * product was created, and two dates that mean different things.
 *
 * **Metadata Updated** is when someone last edited the product's own record,
 * such as its title or description. **Objects Updated** is when any object in
 * the product was last written, from the metadata catalog, shown as the
 * viewer's local date, with the full time and how long ago on hover. The
 * catalog loads in the browser after the page, so that row appears a moment
 * later, and is left out for a product it has no date for.
 */
const meta = {
  title: "Features/Product page/Details/ProductMetaCard",
  component: ProductMetaCard,
  parameters: { layout: "padded" },
  args: {
    product: {
      account_id: "miskatonic",
      product_id: "abyssal-acoustics",
      title: "Abyssal Acoustics",
      created_at: "2026-03-12T00:00:00Z",
      updated_at: "2026-06-01T09:00:00Z",
      visibility: ProductVisibility.Public,
      metadata: { mirrors: {}, primary_mirror: "" },
      disabled: false,
      featured: 0,
      // Cast: the card reads the owner's name and avatar, no email, so the
      // avatar falls back to an initial instead of fetching Gravatar.
      account: { account_id: "miskatonic", name: "Miskatonic University", type: "organization" },
    } as unknown as Product,
  },
} satisfies Meta<typeof ProductMetaCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The product's objects were last written three days ago; hover the date to read that. */
export const Default: Story = {
  beforeEach: () => {
    const realFetch = window.fetch;
    window.fetch = async (input, init) =>
      String(input).includes("/api/catalog")
        ? Response.json([
            {
              account_id: "miskatonic",
              product_id: "abyssal-acoustics",
              objects_updated_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
            },
          ])
        : realFetch(input, init);
    return () => {
      window.fetch = realFetch;
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTitle(/\(3 days ago\)$/)).toBeInTheDocument();
    await expect(canvas.getByText("Metadata Updated")).toBeInTheDocument();
  },
};
