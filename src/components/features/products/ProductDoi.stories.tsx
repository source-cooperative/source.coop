import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductDoi } from "./ProductDoi";

/** A product's DOI, with a button to copy it. */
const meta = {
  title: "Features/Products/ProductDoi",
  component: ProductDoi,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProductDoi>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { doi: "https://doi.org/10.34911/rdnt.gcydkj" },
};

// A real viewport, not a fixed-width box: a box as wide as the frame has no
// page padding, so the copy button overhangs as the real page never does.
const mobile = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
};

/** At phone width the DOI should end in an ellipsis, copy button still on screen. */
export const Narrow: Story = { ...mobile, args: Default.args };

/** Registered DOIs run much longer than the common case. */
export const LongDoi: Story = {
  ...mobile,
  args: {
    doi: "https://doi.org/10.5061/dryad.salish-sea-hydrophone-timeseries.2026.v3",
  },
};
