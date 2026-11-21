import { Box, Flex, Text, Badge, Separator, Link } from "@radix-ui/themes";

export interface ValidationSummary {
  parquet_valid: boolean;
  geoparquet_valid: boolean;
  geoparquet_version: string | null;
  stac_geoparquet_valid: boolean;
  counts: {
    error: number;
    warning: number;
    compat: number;
    info: number;
  };
}

export interface ValidationFinding {
  id: string;
  severity: "error" | "warning" | "compat" | "info";
  section: string;
  message: string;
  reference: string;
}

const SEVERITY_COLOR: Record<ValidationFinding["severity"], "red" | "orange" | "amber" | "gray"> =
  { error: "red", warning: "orange", compat: "amber", info: "gray" };

interface StacGeoParquetValidationSummaryProps {
  summary: ValidationSummary;
  /** Non-info findings to display below the summary row. */
  findings: ValidationFinding[];
}

/**
 * Displays validation results from the stac-geoparquet-validator service below
 * the object preview iframe. Shows overall validity, severity counts, and the
 * individual finding messages for every non-info finding.
 */
export function StacGeoParquetValidationSummary({
  summary,
  findings,
}: StacGeoParquetValidationSummaryProps) {
  const { counts } = summary;
  const visibleFindings = findings.filter((f) => f.severity !== "info");
  return (
    <Box mt="4">
      <Separator size="4" mb="3" />
      <Flex align="center" justify="between" wrap="wrap" gap="2">
        <Flex align="center" gap="2" wrap="wrap">
          <Text size="2" weight="bold" color="gray">
            Validation
          </Text>
          <Badge color={summary.stac_geoparquet_valid ? "green" : "red"} size="1">
            {summary.stac_geoparquet_valid ? "Valid" : "Invalid"}
          </Badge>
          {counts.error > 0 && (
            <Badge color="red" size="1" variant="soft">
              {counts.error} {counts.error === 1 ? "error" : "errors"}
            </Badge>
          )}
          {counts.warning > 0 && (
            <Badge color="orange" size="1" variant="soft">
              {counts.warning} {counts.warning === 1 ? "warning" : "warnings"}
            </Badge>
          )}
          {counts.compat > 0 && (
            <Badge color="amber" size="1" variant="soft">
              {counts.compat} compat
            </Badge>
          )}
        </Flex>
        <Link
          href="https://validate.stac-geoparquet.org"
          target="_blank"
          rel="noopener noreferrer"
          size="1"
        >
          stac-geoparquet-validator
        </Link>
      </Flex>
      {visibleFindings.length > 0 && (
        <Box mt="3">
          {visibleFindings.map((f) => (
            <Flex key={f.id} align="start" gap="2" mb="2">
              <Box flexShrink="0" pt="2px">
                <Badge color={SEVERITY_COLOR[f.severity]} size="1" variant="soft">
                  {f.severity}
                </Badge>
              </Box>
              <Text size="1" color="gray">
                {f.message}{" "}
                {f.reference && (
                  <Link href={f.reference} target="_blank" rel="noopener noreferrer" size="1">
                    spec
                  </Link>
                )}
              </Text>
            </Flex>
          ))}
        </Box>
      )}
    </Box>
  );
}
