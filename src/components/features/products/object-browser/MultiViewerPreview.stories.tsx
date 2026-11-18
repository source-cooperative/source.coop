import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MultiViewerPreview } from "./MultiViewerPreview";

/**
 * Embeds two viewers for the same object with a segmented control switcher.
 * The first viewer is shown by default; clicking the other label swaps the
 * iframe in place without navigating away.
 */
const meta = {
  title: "Features/Product page/MultiViewerPreview",
  component: MultiViewerPreview,
  parameters: { layout: "padded" },
} satisfies Meta<typeof MultiViewerPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A STAC GeoParquet file: map viewer shown by default, switchable to table. */
export const StacGeoParquet: Story = {
  name: "STAC GeoParquet",
  args: {
    viewers: [
      { url: "https://developmentseed.org/stac-map?href=...", label: "Map" },
      { url: "https://source-cooperative.github.io/parquet-table/?iframe=true&url=...", label: "Table" },
    ],
    title: "example.parquet",
  },
};
