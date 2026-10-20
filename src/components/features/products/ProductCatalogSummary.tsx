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
  FileTypeBar,
  FileTypeSwatch,
  fileTypeSegments,
  formatMeasure,
  formatShare,
  hasCatalogStats,
} from "./ProductCatalogStats";
import styles from "./ProductCatalogStats.module.css";

const HELP = {
  size: "Total size of every file in the product.",
  files: "Number of files in the product, in every folder.",
};

/** Sidebar card breaking a product's files down by type, by size or by count. */
export function ProductFileTypesCard({ entry }: { entry?: CatalogEntry }) {
  const [measure, setMeasure] = useState<CatalogMeasure>();
  if (!hasCatalogStats(entry)) return null;
  const active = measure ?? defaultMeasure(entry);
  const segments = fileTypeSegments(entry, active);

  return (
    // flexShrink 0 for the same reason as UsageCard: the stretched meta
    // column would otherwise crush the card.
    <Card size={{ initial: "2", sm: "1" }} style={{ flexShrink: 0 }}>
      <SectionHeader
        title="File types"
        rightButton={
          <SegmentedControl.Root
            size="1"
            value={active}
            onValueChange={(value) => setMeasure(value as CatalogMeasure)}
            aria-label="Measure file types by"
          >
            <SegmentedControl.Item value="bytes">Size</SegmentedControl.Item>
            <SegmentedControl.Item value="files">Count</SegmentedControl.Item>
          </SegmentedControl.Root>
        }
      >
        <StatRow pb="3" style={{ borderBottom: "1px solid var(--gray-4)" }}>
          <Stat
            label="Total size"
            help={HELP.size}
            value={entry.total_bytes === undefined ? "—" : formatBytes(entry.total_bytes)}
          />
          <Stat
            label="Files"
            help={HELP.files}
            value={entry.object_count?.toLocaleString("en-US") ?? "—"}
          />
        </StatRow>

        {segments.length > 0 && (
          <Box mt="3">
            <MonoLabel>By {active === "bytes" ? "size" : "file count"}</MonoLabel>
            <Box mt="2">
              <FileTypeBar segments={segments} measure={active} height={14} />
            </Box>
            <Flex direction="column" gap="1" mt="3">
              {segments.map(({ label, value, share }, index) => (
                <Flex key={label} align="center" gap="2">
                  <FileTypeSwatch index={index} />
                  <Text size="1" className={styles.mono} style={{ flex: 1, overflowWrap: "anywhere" }}>
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
  return <ProductFileTypesCard entry={catalog?.get(`${accountId}/${productId}`)} />;
}
