import { Box, Card, Flex, Skeleton, Text } from "@radix-ui/themes";
import { SectionHeader } from "@/components/core/SectionHeader";
import { formatBytes } from "@/lib/format";
import type { CatalogEntry } from "@/types/catalog";
import styles from "./ProductCatalogStats.module.css";

export type CatalogMeasure = "bytes" | "files";

export interface FileTypeSegment {
  /** Lowercase extension, "no extension", or "other". */
  label: string;
  value: number;
  /** Fraction of the measure's total, 0–1. */
  share: number;
}

// Four fills, told apart by shade and pattern rather than hue: neighbours
// always differ in both. Segments take them by rank, so a fill means "second
// largest", not a particular extension.
const FILLS = [styles.fill0, styles.fill1, styles.fill2, styles.fill3];

export function hasCatalogStats(entry?: CatalogEntry): entry is CatalogEntry {
  return !!entry && (
    entry.total_bytes !== undefined ||
    entry.object_count !== undefined ||
    Object.values(entry.exts ?? {}).some((count) => count > 0) ||
    Object.values(entry.ext_bytes ?? {}).some((bytes) => bytes > 0)
  );
}

/** Bytes when the entry has a per-extension byte breakdown, else file counts. */
export function defaultMeasure(entry: CatalogEntry): CatalogMeasure {
  return Object.values(entry.ext_bytes ?? {}).some((bytes) => bytes > 0)
    ? "bytes"
    : "files";
}

/**
 * The three largest extensions by the given measure, then everything else as
 * "other" — never more than the four fills. Shares are of the whole-product
 * total when the catalog has one, so "other" also covers extensions the
 * breakdown leaves out.
 */
export function fileTypeSegments(
  entry: CatalogEntry,
  measure: CatalogMeasure,
): FileTypeSegment[] {
  const values = (measure === "bytes" ? entry.ext_bytes : entry.exts) ?? {};
  const sorted = Object.entries(values)
    .filter(([, value]) => value > 0)
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b));
  // Without a breakdown the whole bar would be one "other" segment.
  if (sorted.length === 0) return [];
  const listed = sorted.reduce((sum, [, value]) => sum + value, 0);
  const total = Math.max(
    (measure === "bytes" ? entry.total_bytes : entry.object_count) ?? 0,
    listed,
  );
  if (total === 0) return [];

  const top = sorted.slice(0, 3);
  const rest = total - top.reduce((sum, [, value]) => sum + value, 0);
  const segments = top.map(([extension, value]) => ({
    label: extension ? extension.toLowerCase() : "no extension",
    value,
    share: value / total,
  }));
  if (rest > 0) segments.push({ label: "other", value: rest, share: rest / total });
  return segments;
}

export function formatShare(share: number) {
  return share > 0 && share < 0.01 ? "<1%" : `${Math.round(share * 100)}%`;
}

export function formatMeasure(value: number, measure: CatalogMeasure) {
  return measure === "bytes"
    ? formatBytes(value)
    : value.toLocaleString("en-US");
}

/** A segment's fill, or the Analytics card's green while it is hovered. */
function fill(index: number, hovered?: number | null) {
  return index === hovered ? styles.hovered : FILLS[index];
}

export function FileTypeSwatch({
  index,
  hovered,
}: {
  index: number;
  hovered?: number | null;
}) {
  return <span className={`${styles.swatch} ${fill(index, hovered)}`} aria-hidden />;
}

export function FileTypeBar({
  segments,
  measure,
  height = 8,
  hovered,
  onHover,
}: {
  segments: FileTypeSegment[];
  measure: CatalogMeasure;
  height?: number;
  hovered?: number | null;
  onHover?: (index: number | null) => void;
}) {
  const by = measure === "bytes" ? "size" : "file count";
  return (
    <div
      className={styles.bar}
      style={{ height }}
      role="img"
      onMouseLeave={() => onHover?.(null)}
      aria-label={`File types by ${by}: ${segments
        .map(({ label, share }) => `${label} ${formatShare(share)}`)
        .join(", ")}`}
    >
      {segments.map(({ label, value, share }, index) => (
        <span
          key={label}
          className={fill(index, hovered)}
          style={{ flexGrow: share }}
          onMouseEnter={() => onHover?.(index)}
          // ponytail: native title as the hover detail; a Radix Tooltip if
          // people need it on touch.
          title={`${label}: ${formatMeasure(value, measure)} (${formatShare(share)})`}
        />
      ))}
    </div>
  );
}

/**
 * Totals, a slim file-type bar and its legend, for a product list card.
 * Renders nothing when the catalog has no statistics for the product.
 */
export function ProductCatalogStats({ entry }: { entry?: CatalogEntry }) {
  if (!hasCatalogStats(entry)) return null;
  const measure = defaultMeasure(entry);
  const segments = fileTypeSegments(entry, measure);
  const totals = [
    entry.total_bytes !== undefined && formatBytes(entry.total_bytes),
    entry.object_count !== undefined &&
      `${entry.object_count.toLocaleString("en-US")} files`,
  ].filter(Boolean);

  return (
    <Box mt="3" aria-label="File types">
      {segments.length > 0 && <FileTypeBar segments={segments} measure={measure} />}
      <Flex mt="2" gapX="4" gapY="1" wrap="wrap" align="center">
        {totals.length > 0 && (
          <Text size="1" weight="medium" className={styles.mono}>
            {totals.join(" · ")}
          </Text>
        )}
        {segments.map(({ label, share }, index) => (
          <Flex key={label} align="center" gap="1">
            <FileTypeSwatch index={index} />
            <Text size="1" color="gray">
              {label} {formatShare(share)}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}

// Skeletons live here rather than beside their "use client" components so
// the server loading.tsx files can render them.

/** Loading stand-in for ProductCatalogStats on a product list card. */
export function ProductCatalogStatsSkeleton() {
  return (
    <Box mt="3">
      <Skeleton width="100%" height="8px" />
      <Flex mt="2" gapX="4" align="center">
        <Skeleton width="130px" height="12px" />
        <Skeleton width="70px" height="12px" />
        <Skeleton width="70px" height="12px" />
        <Skeleton width="60px" height="12px" />
      </Flex>
    </Box>
  );
}

/** Loading stand-in for the File types card in the product page sidebar. */
export function ProductFileTypesCardSkeleton() {
  return (
    <Card size={{ initial: "2", sm: "1" }} style={{ flexShrink: 0 }}>
      <SectionHeader
        title="File types"
        rightButton={<Skeleton width="96px" height="24px" />}
      >
        <Flex gap="3" pb="3" style={{ borderBottom: "1px solid var(--gray-4)" }}>
          <Skeleton width="80px" height="40px" />
          <Skeleton width="80px" height="40px" />
        </Flex>
        <Box mt="3">
          <Skeleton width="60px" height="12px" />
          <Box mt="2">
            <Skeleton width="100%" height="14px" />
          </Box>
          <Flex direction="column" gap="2" mt="3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} width="100%" height="12px" />
            ))}
          </Flex>
        </Box>
      </SectionHeader>
    </Card>
  );
}
