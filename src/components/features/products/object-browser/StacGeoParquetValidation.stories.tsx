import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card } from "@radix-ui/themes";
import { StacGeoParquetValidationSummary } from "./StacGeoParquetValidationSummary";

/**
 * Validation results from the stac-geoparquet-validator service, displayed
 * below the object preview iframe when a `.parquet` file is detected as STAC
 * GeoParquet. The summary shows overall validity and severity counts (errors,
 * warnings, compat notices), with individual finding messages listed below.
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

/** A fully valid STAC GeoParquet file with no actionable issues. */
export const Valid: Story = {
  args: {
    summary: {
      parquet_valid: true,
      geoparquet_valid: true,
      geoparquet_version: "1.0.0",
      stac_geoparquet_valid: true,
      counts: { error: 0, warning: 0, compat: 0, info: 3 },
    },
    findings: [],
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
    findings: [
      {
        id: "bp.compression",
        severity: "warning",
        section: "geoparquet_best_practices",
        message: "Column compression should use zstd or snappy for best interoperability.",
        reference: "https://geoparquet.org/releases/v1.0.0/#best-practices",
      },
      {
        id: "bp.row_group_size",
        severity: "warning",
        section: "geoparquet_best_practices",
        message: "Row group size is very large; consider 100 000–1 000 000 rows per group.",
        reference: "https://geoparquet.org/releases/v1.0.0/#best-practices",
      },
      {
        id: "compat.geometry_types",
        severity: "compat",
        section: "geoparquet",
        message: "geometry_types is not set; older readers may not be able to optimise queries.",
        reference: "https://geoparquet.org/releases/v1.0.0/#geometry-columns",
      },
    ],
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
    findings: [
      {
        id: "geoparquet.missing_metadata",
        severity: "error",
        section: "geoparquet",
        message: "Required 'geo' key is missing from the Parquet file metadata.",
        reference: "https://geoparquet.org/releases/v1.0.0/#file-metadata",
      },
      {
        id: "geoparquet.invalid_crs",
        severity: "error",
        section: "geoparquet",
        message: "CRS is not a valid PROJJSON object.",
        reference: "https://geoparquet.org/releases/v1.0.0/#crs",
      },
      {
        id: "stac_geoparquet.missing_column",
        severity: "error",
        section: "stac_geoparquet",
        message: "Required column 'stac_version' is missing.",
        reference: "https://github.com/stac-utils/stac-geoparquet/blob/main/spec/stac-geoparquet-spec.md",
      },
      {
        id: "bp.compression",
        severity: "warning",
        section: "geoparquet_best_practices",
        message: "Column compression should use zstd or snappy for best interoperability.",
        reference: "https://geoparquet.org/releases/v1.0.0/#best-practices",
      },
    ],
  },
};
