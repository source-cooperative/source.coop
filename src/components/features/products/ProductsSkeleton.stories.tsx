import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductsSkeleton } from "./ProductsSkeleton";

/**
 * What the product list shows while it loads.
 *
 * Worth putting beside the real list: a skeleton whose proportions do not match
 * what replaces it produces a visible jump the moment data arrives.
 */
const meta = {
  title: "Features/Products/ProductsSkeleton",
  component: ProductsSkeleton,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProductsSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Where the surrounding page already owns the filters. */
export const WithoutFilters: Story = {
  args: { showFilters: false },
};
