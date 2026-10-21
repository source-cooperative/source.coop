"use client";

import { useState } from "react";
import { Box, Card, Flex, SegmentedControl, Text } from "@radix-ui/themes";
import { SectionHeader } from "@/components/core/SectionHeader";
import { MonoLabel, Stat, StatRow } from "@/components/features/analytics/panels";
import { useCatalog } from "@/hooks/useCatalog";
import { formatBytes } from "@/lib/format";
import type { CatalogEntry } from "@/types/catalog";
import {
  type CatalogMeasure,
  defaultMeasure,
  ObjectTypeBar,
  ObjectTypeSwatch,
  objectTypeSegments,
  formatMeasure,
  formatShare,
  hasCatalogStats,
} from "./ProductCatalogStats";
import styles from "./ProductCatalogStats.module.css";

const HELP = {
  size: "Total bytesize of every object in the product.",
  objects: "Number of objects in the product, in every folder.",
};

/** Sidebar card breaking a product's objects down by type, by bytesize or by count. */
export function ProductObjectTypesCard({ entry }: { entry?: CatalogEntry }) {
  const [measure, setMeasure] = useState<CatalogMeasure>();
  // One index for the bar and the legend, so hovering either lights both.
  const [hovered, setHovered] = useState<number | null>(null);
  if (!hasCatalogStats(entry)) return null;
  const active = measure ?? defaultMeasure(entry);
  const segments = objectTypeSegments(entry, active);

  return (
    // flexShrink 0 for the same reason as UsageCard: the stretched meta
    // column would otherwise crush the card.
    <Card size={{ initial: "2", sm: "1" }} style={{ flexShrink: 0 }}>
      <SectionHeader
        title="Object types"
        rightButton={
          <SegmentedControl.Root
            size="1"
            value={active}
            onValueChange={(value) => setMeasure(value as CatalogMeasure)}
            aria-label="Measure object types by"
          >
            <SegmentedControl.Item value="bytes">Bytesize</SegmentedControl.Item>
            <SegmentedControl.Item value="objects">Count</SegmentedControl.Item>
          </SegmentedControl.Root>
        }
      >
        <StatRow pb="3" style={{ borderBottom: "1px solid var(--gray-4)" }}>
          <Stat
            label="Total bytesize"
            help={HELP.size}
            value={entry.total_bytes === undefined ? "—" : formatBytes(entry.total_bytes)}
          />
          <Stat
            label="Objects"
            help={HELP.objects}
            value={entry.object_count?.toLocaleString("en-US") ?? "—"}
          />
        </StatRow>

        {segments.length > 0 && (
          <Box mt="3">
            <MonoLabel>By {active === "bytes" ? "bytesize" : "object count"}</MonoLabel>
            <Box mt="2">
              <ObjectTypeBar
                segments={segments}
                measure={active}
                height={14}
                hovered={hovered}
                onHover={setHovered}
              />
            </Box>
            <Flex direction="column" gap="1" mt="3" onMouseLeave={() => setHovered(null)}>
              {segments.map(({ label, value, share }, index) => (
                <Flex key={label} align="center" gap="2" onMouseEnter={() => setHovered(index)}>
                  <ObjectTypeSwatch index={index} hovered={hovered} />
                  <Text
                    size="1"
                    color={index === hovered ? "green" : undefined}
                    className={styles.mono}
                    style={{ flex: 1, overflowWrap: "anywhere" }}
                  >
                    {label}
                  </Text>
                  <Text size="1" color="gray" className={styles.mono}>
                    {formatMeasure(value, active)}
                  </Text>
                  <Text size="1" color="gray" align="right" className={styles.mono} style={{ width: "3.5em" }}>
                    {formatShare(share)}
                  </Text>
                </Flex>
              ))}
            </Flex>
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
