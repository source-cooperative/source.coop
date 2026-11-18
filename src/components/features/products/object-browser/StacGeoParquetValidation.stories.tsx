import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card } from "@radix-ui/themes";
import { StacGeoParquetValidationSummary } from "./StacGeoParquetValidationSummary";

/**
 * Validation results from the stac-geoparquet-validator service, displayed
 * below the object preview iframe when a `.parquet` file is detected as STAC
 * GeoParquet. The summary shows overall validity and severity counts (errors,
 * warnings, compat notices), with a link to the upstream validator.
 */
const meta = {
  title: "Features/Product page/StacGeoParquetValidationSummary",
  component: StacGeoParquetValidationSummary,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Card>
        <Story />
      </Card>
    ),
  ],
} satisfies Meta<typeof StacGeoParquetValidationSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A fully valid STAC GeoParquet file with no issues. */
export const Valid: Story = {
  args: {
    summary: {
      parquet_valid: true,
      geoparquet_valid: true,
      geoparquet_version: "1.0.0",
      stac_geoparquet_valid: true,
      counts: { error: 0, warning: 0, compat: 0, info: 3 },
    },
  },
};

/** A valid file with best-practice warnings and a compatibility notice. */
export const WithWarnings: Story = {
  args: {
    summary: {
      parquet_valid: true,
      geoparquet_valid: true,
      geoparquet_version: "1.0.0",
      stac_geoparquet_valid: true,
      counts: { error: 0, warning: 2, compat: 1, info: 3 },
    },
  },
};

/** A file that fails STAC GeoParquet validation with errors. */
export const Invalid: Story = {
  args: {
    summary: {
      parquet_valid: true,
      geoparquet_valid: false,
      geoparquet_version: null,
      stac_geoparquet_valid: false,
      counts: { error: 3, warning: 1, compat: 0, info: 2 },
    },
  },
};
