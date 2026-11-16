import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Box, Card, Text } from "@radix-ui/themes";
import { ObjectPreviewCard } from "./ObjectPreviewCard";

/**
 * Header and body shell for the Object Preview card. The header row has three
 * columns: the "Object Preview" title (left), a short format label derived from
 * the store probe or the object's extension (center), and an "Open in new tab"
 * link (right) when an external viewer URL is available.
 *
 * The label and link are each independently optional: a FlatGeobuf object has a
 * label but no viewer; an object with no extension has neither.
 */
const meta = {
  title: "Features/Product page/ObjectPreviewCard",
  component: ObjectPreviewCard,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Card>
        <Story />
      </Card>
    ),
  ],
} satisfies Meta<typeof ObjectPreviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const viewerPlaceholder = (
  <Box
    style={{
      height: 200,
      background: "var(--gray-3)",
      borderRadius: "var(--radius-2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Text size="1" color="gray">
      Viewer iframe
    </Text>
  </Box>
);

const noPreview = (
  <Text size="2" color="gray">
    No preview available
  </Text>
);

/** A Cloud-Optimized GeoTIFF: label and "Open in new tab" link both present. */
export const COG: Story = {
  args: {
    viewerUrl: "https://source-cooperative.github.io/cog-viewer/?url=...",
    label: "COG",
    children: viewerPlaceholder,
  },
};

/** A Zarr v2 store detected by the server-side probe. */
export const ZarrV2: Story = {
  name: "Zarr v2",
  args: {
    viewerUrl: "https://source-cooperative.github.io/zarr-viewer/?url=...",
    label: "Zarr v2",
    children: viewerPlaceholder,
  },
};

/** An Icechunk v2 store: the label combines the Icechunk spec version and the Zarr version. */
export const IcechunkV2: Story = {
  name: "Icechunk v2 · Zarr v3",
  args: {
    viewerUrl: "https://source-cooperative.github.io/zarr-viewer/?url=...",
    label: "Icechunk v2 · Zarr v3",
    children: viewerPlaceholder,
  },
};

/**
 * A FlatGeobuf object: the extension is recognized and labeled, but no viewer
 * has been implemented yet, so only the label appears in the header.
 */
export const LabelNoViewer: Story = {
  name: "Label, no viewer (FlatGeobuf)",
  args: {
    viewerUrl: null,
    label: "FlatGeobuf",
    children: noPreview,
  },
};

/**
 * An object with no file extension: neither a label nor a viewer link can be
 * derived, so the header shows only the "Object Preview" title.
 */
export const NoExtension: Story = {
  name: "No extension",
  args: {
    viewerUrl: null,
    label: null,
    children: noPreview,
  },
};
