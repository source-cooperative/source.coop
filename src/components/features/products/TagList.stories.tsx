import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TagList } from "./TagList";

/** A product's tags, each linking to the filtered product list. */
const meta = {
  title: "Features/Product page/Summary/TagList",
  component: TagList,
  parameters: { layout: "padded" },
} satisfies Meta<typeof TagList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { tags: ["bathymetry", "acoustics", "cetaceans"] },
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
