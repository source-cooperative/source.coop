import { Badge, Box, Card, Flex, Skeleton, Text } from "@radix-ui/themes";
import { SectionHeader } from "@/components/core/SectionHeader";
import { formatBytes, formatRelative } from "@/lib/format";
import type { CatalogEntry } from "@/types/catalog";
import styles from "./ProductCatalogStats.module.css";

export type CatalogMeasure = "bytes" | "objects";

export interface ObjectTypeSegment {
  /** Lowercase extension, "no extension", or "other". */
  label: string;
  value: number;
  /** Fraction of the measure's total, 0–1. */
  share: number;
}

// Four fills, told apart by shade and pattern rather than hue: hollow, hatched,
// mid gray, dotted, so neighbours always differ in both. Segments take them by rank, so a fill means "second
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

/** Bytes when the entry has a per-extension byte breakdown, else object counts. */
export function defaultMeasure(entry: CatalogEntry): CatalogMeasure {
  return Object.values(entry.ext_bytes ?? {}).some((bytes) => bytes > 0)
    ? "bytes"
    : "objects";
}

/**
 * The three largest extensions by the given measure, then everything else as
 * "other" — never more than the four fills. Shares are of the whole-product
 * total when the catalog has one, so "other" also covers extensions the
 * breakdown leaves out.
 */
export function objectTypeSegments(
  entry: CatalogEntry,
  measure: CatalogMeasure,
): ObjectTypeSegment[] {
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

/** A whole percentage, with "<1%" and ">99%" so slivers never read as 0% or 100%. */
export function formatShare(share: number) {
  if (share > 0 && share < 0.01) return "<1%";
  if (share > 0.99 && share < 1) return ">99%";
  return `${Math.round(share * 100)}%`;
}

export function formatMeasure(value: number, measure: CatalogMeasure) {
  return measure === "bytes"
    ? formatBytes(value)
    : value.toLocaleString("en-US");
}

/** A segment's fill, recolored green while it is hovered. */
function fill(index: number, hovered?: number | null) {
  return index === hovered ? `${FILLS[index]} ${styles.hovered}` : FILLS[index];
}

export function ObjectTypeSwatch({
  index,
  hovered,
}: {
  index: number;
  hovered?: number | null;
}) {
  return <span className={`${styles.swatch} ${fill(index, hovered)}`} aria-hidden />;
}

export function ObjectTypeBar({
  segments,
  measure,
  height = 8,
  hovered,
  onHover,
}: {
  segments: ObjectTypeSegment[];
  measure: CatalogMeasure;
  height?: number;
  hovered?: number | null;
  onHover?: (index: number | null) => void;
}) {
  const by = measure === "bytes" ? "bytesize" : "object count";
  return (
    <div
      className={styles.bar}
      style={{ height }}
      role="img"
      onMouseLeave={() => onHover?.(null)}
      aria-label={`Object types by ${by}: ${segments
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

const objects = (count: number) =>
  `${count.toLocaleString("en-US")} ${count === 1 ? "object" : "objects"}`;

/**
 * "18,302 objects, updated 3 days ago" for a product list card's metadata
 * row, or as much of it as the catalog knows. The update time is relative to
 * now, which is safe because the catalog only loads client-side.
 */
export function catalogObjectsPhrase(entry?: CatalogEntry): string | undefined {
  if (!entry) return undefined;
  const updated = entry.objects_updated_at && formatRelative(entry.objects_updated_at);
  if (entry.object_count === undefined) return updated && `Objects updated ${updated}`;
  return objects(entry.object_count) + (updated ? `, updated ${updated}` : "");
}

/** The product's store format (zarr, icechunk, …) as a pill, if it has one. */
export function StoreFormatPill({ entry }: { entry?: CatalogEntry }) {
  if (!entry?.store_format) return null;
  return (
    <Badge size="1" variant="outline" color="gray" radius="full" className={styles.formatPill}>
      {entry.store_format}
    </Badge>
  );
}

/**
 * The footer of a product list card: the product's total, leading a slim bar
 * of its object types, with the legend beneath. The total names what the bar
 * and its percentages measure, so no label is needed. Renders nothing when
 * the catalog has no statistics for the product.
 */
export function ProductCatalogStats({ entry }: { entry?: CatalogEntry }) {
  if (!hasCatalogStats(entry)) return null;
  const measure = defaultMeasure(entry);
  const segments = objectTypeSegments(entry, measure);
  const total = measure === "bytes"
    ? entry.total_bytes !== undefined && formatBytes(entry.total_bytes)
    : entry.object_count !== undefined && objects(entry.object_count);
  if (!total && segments.length === 0) return null;

  return (
    <Flex mt="3" gapX="4" gapY="2" wrap="wrap" align="center" aria-label="Object types">
      <Flex align="center" gap="2" className={segments.length > 0 ? styles.lead : undefined}>
        {total && (
          <Text size="1" weight="medium" className={`${styles.mono} ${styles.total}`}>
            {total}
          </Text>
        )}
        {segments.length > 0 && (
          <Box flexGrow="1">
            <ObjectTypeBar segments={segments} measure={measure} />
          </Box>
        )}
      </Flex>
      {/* Beside the bar while the card has room, under it when it doesn't. */}
      {segments.length > 0 && (
        <Flex gapX="3" gapY="1" wrap="wrap" align="center" className={styles.legend}>
          {segments.map(({ label, share }, index) => (
            <Flex key={label} align="center" gap="1">
              <ObjectTypeSwatch index={index} />
              <Text size="1" color="gray">
                {label} {formatShare(share)}
              </Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Flex>
  );
}

// Skeletons live here rather than beside their "use client" components so
// the server loading.tsx files can render them.

/** Loading stand-in for ProductCatalogStats on a product list card. */
export function ProductCatalogStatsSkeleton() {
  return (
    <Flex mt="3" gapX="4" gapY="2" wrap="wrap" align="center">
      <Flex align="center" gap="2" className={styles.lead}>
        <Skeleton width="56px" height="12px" />
        <Skeleton height="8px" style={{ flexGrow: 1 }} />
      </Flex>
      <Flex gapX="3" align="center" className={styles.legend}>
        <Skeleton width="60px" height="12px" />
        <Skeleton width="70px" height="12px" />
        <Skeleton width="60px" height="12px" />
      </Flex>
    </Flex>
  );
}

/** Loading stand-in for the Object types card in the product page sidebar. */
export function ProductObjectTypesCardSkeleton() {
  return (
    <Card size={{ initial: "2", sm: "1" }} style={{ flexShrink: 0 }}>
      <SectionHeader
        title="Object types"
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
