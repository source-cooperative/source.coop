"use client";

import { useState } from "react";
import { Box, Card, Text } from "@radix-ui/themes";
import { SectionHeader } from "@/components/core/SectionHeader";
import { MonoLabel, Stat, StatRow } from "@/components/features/analytics/panels";
import { useCatalog } from "@/hooks/useCatalog";
import { formatBytes } from "@/lib/format";
import type { CatalogEntry } from "@/types/catalog";
import {
  defaultMeasure,
  ObjectTypeBar,
  ObjectTypeSwatch,
  objectTypeRows,
  objectTypeSegments,
  formatCount,
  formatShare,
  hasCatalogStats,
} from "./ProductCatalogStats";
import styles from "./ProductCatalogStats.module.css";

const HELP = {
  bytes: "Total byte volume of every object in the product.",
  objects: "Number of objects in the product, in every folder.",
};

const count = (value?: number) => (value === undefined ? "—" : formatCount(value));
const exact = (value?: number) => value?.toLocaleString("en-US");
const bytes = (value?: number) => (value === undefined ? "—" : formatBytes(value));
const share = (value?: number) => (value === undefined ? "" : formatShare(value));

/**
 * Sidebar card breaking a product's objects down by type: a bar by byte
 * volume, then a table giving each type's byte volume, and its object count
 * with that count's share. The bar already shows the byte shares; the object
 * shares can differ from them a lot, so the table carries those.
 */
export function ProductObjectTypesCard({ entry }: { entry?: CatalogEntry }) {
  // One index for the bar and the table, so hovering either lights both.
  const [hovered, setHovered] = useState<number | null>(null);
  if (!hasCatalogStats(entry)) return null;
  const measure = defaultMeasure(entry);
  const segments = objectTypeSegments(entry, measure);
  const rows = objectTypeRows(entry, segments);

  return (
    // flexShrink 0 for the same reason as UsageCard: the stretched meta
    // column would otherwise crush the card.
    <Card size={{ initial: "2", sm: "1" }} style={{ flexShrink: 0 }}>
      <SectionHeader title="Object types">
        <StatRow pb="3" style={{ borderBottom: "1px solid var(--gray-4)" }}>
          <Stat label="Byte volume" help={HELP.bytes} value={bytes(entry.total_bytes)} />
          <Stat
            label="Objects"
            help={exact(entry.object_count) ? `${HELP.objects} Exactly ${exact(entry.object_count)}.` : HELP.objects}
            value={count(entry.object_count)}
          />
        </StatRow>

        {segments.length > 0 && (
          <Box mt="3">
            <MonoLabel>By {measure === "bytes" ? "byte volume" : "object count"}</MonoLabel>
            <Box mt="2">
              <ObjectTypeBar
                segments={segments}
                measure={measure}
                height={14}
                hovered={hovered}
                onHover={setHovered}
              />
            </Box>
            {/* Scrolls sideways rather than spilling out of a narrow sidebar
                (three columns start at the md breakpoint). */}
            <Box className={styles.tableWrap}>
              <table className={styles.table} onMouseLeave={() => setHovered(null)}>
                <thead>
                  <tr>
                    <th scope="col"><MonoLabel>Extension</MonoLabel></th>
                    <th scope="col"><MonoLabel>Bytes</MonoLabel></th>
                    <th scope="col" colSpan={2}><MonoLabel>Objects</MonoLabel></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.label} onMouseEnter={() => setHovered(index)}>
                      <th scope="row">
                        <ObjectTypeSwatch index={index} hovered={hovered} />
                        <Text color={index === hovered ? "green" : undefined}>{row.label}</Text>
                      </th>
                      <td>{bytes(row.bytes)}</td>
                      <td title={exact(row.objects)}>{count(row.objects)}</td>
                      <td className={styles.share}>{share(row.objectShare)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
        )}
      </SectionHeader>
    </Card>
  );
}

export function ProductCatalogSummary({
  accountId,
  productId,
}: {
  accountId: string;
  productId: string;
}) {
  const catalog = useCatalog(true);
  return <ProductObjectTypesCard entry={catalog?.get(`${accountId}/${productId}`)} />;
}
