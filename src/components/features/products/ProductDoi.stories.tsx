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

/**
 * The bug this component exists for: at phone width the DOI used to push the
 * row past the viewport. It should now end in an ellipsis, with the copy
 * button still on screen.
 */
export const Narrow: Story = {
  args: Default.args,
  decorators: [
    (Story) => (
      <div style={{ width: 320, outline: "1px dashed var(--gray-6)" }}>
        <Story />
      </div>
    ),
  ],
};

/** Registered DOIs run much longer than the common case. */
export const LongDoi: Story = {
  ...Narrow,
  args: {
    doi: "https://doi.org/10.5061/dryad.salish-sea-hydrophone-timeseries.2026.v3",
  },
};
