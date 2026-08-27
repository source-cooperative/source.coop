import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TagList } from "./TagList";

/** A product's tags, each linking to the filtered product list. */
const meta = {
  title: "Products/TagList",
  component: TagList,
  parameters: { layout: "padded" },
} satisfies Meta<typeof TagList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { tags: ["bathymetry", "acoustics", "cetaceans"] },
};

/** Nothing tagged: it should collapse rather than leave a gap. */
export const Empty: Story = {
  args: { tags: [] },
};

/** Real products carry a lot of these; the row has to wrap, not scroll. */
export const Many: Story = {
  args: {
    tags: [
      "bathymetry",
      "acoustics",
      "cetaceans",
      "remote-sensing",
      "north-pacific",
      "time-series",
      "cloud-optimized",
      "public-domain",
      "salish-sea",
      "hydrophone",
    ],
  },
};

export const LongTag: Story = {
  args: { tags: ["synthetic-aperture-radar-interferometry", "sar"] },
};
