import "server-only";

import { cache } from "react";
import { LOGGER } from "@/lib/logging";
import {
  StacGeoParquetValidationSummary,
  type ValidationSummary,
  type ValidationFinding,
} from "./StacGeoParquetValidationSummary";

interface ValidationReport {
  summary: ValidationSummary;
  findings: ValidationFinding[];
}

const fetchValidation = cache(async (href: string): Promise<ValidationReport | null> => {
  try {
    const res = await fetch("https://validate.stac-geoparquet.org/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ href }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return res.json() as Promise<ValidationReport>;
  } catch (error) {
    LOGGER.error(`STAC GeoParquet validation failed: ${error}`, {
      operation: "fetchStacGeoParquetValidation",
      metadata: { href, error: (error as Error).toString() },
    });
    return null;
  }
});

export async function StacGeoParquetValidation({ href }: { href: string }) {
  const report = await fetchValidation(href);
  if (!report) return null;
  return (
    <StacGeoParquetValidationSummary
      summary={report.summary}
      findings={report.findings}
    />
  );
}
