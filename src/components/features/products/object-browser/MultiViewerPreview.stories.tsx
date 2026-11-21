import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MultiViewerPreview } from "./MultiViewerPreview";

/**
 * Full preview card for objects with more than one applicable viewer. The
 * header row shows the format label in the centre and a segmented viewer
 * switcher plus an "Open in new tab" link on the right. Both the switcher
 * and the link track the active viewer so the link always opens the
 * currently embedded viewer.
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
    formatLabel: "STAC GeoParquet",
    title: "example.parquet",
  },
};
