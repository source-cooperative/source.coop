"use client";

import { Box, Card, Flex, Separator } from "@radix-ui/themes";
import { SparklineChart } from "./SparklineChart";
import { PopularFilesTable } from "./PopularFilesTable";
import { PeriodSelector } from "./PeriodSelector";
import { SectionHeader } from "@/components/core/SectionHeader";
import type { DailyProductStats, Period, PopularFile } from "@/lib/clients/analytics";

interface ProductAnalyticsProps {
  data: DailyProductStats[];
  popularFiles: PopularFile[];
  accountId: string;
  productId: string;
  period: Period;
}

export function ProductAnalytics({ data, popularFiles, accountId, productId, period }: ProductAnalyticsProps) {
  if (data.length === 0 && popularFiles.length === 0) return null;

  const totalDownloads = data.reduce((sum, d) => sum + d.downloads, 0);
  const totalBytes = data.reduce((sum, d) => sum + d.bytes, 0);
  const dateRange = formatDateRange(data);

  return (
    <Card size={{ initial: "2", sm: "1" }}>
      <SectionHeader
        title="Analytics"
        rightButton={<PeriodSelector currentPeriod={period} />}
      >
        <Flex direction="column" gap="4">
          <SparklineChart
            data={data}
            dataKey="downloads"
            label="Downloads"
            total={totalDownloads.toLocaleString()}
            dateRange={dateRange}
          />
          <SparklineChart
            data={data}
            dataKey="bytes"
            label="Bytes Downloaded"
            total={formatBytes(totalBytes)}
            dateRange={dateRange}
          />
        </Flex>
        {popularFiles.length > 0 && (
          <Box mt="4">
            <Separator size="4" color="gray" mb="4" />
            <PopularFilesTable
              files={popularFiles}
              accountId={accountId}
              productId={productId}
            />
          </Box>
        )}
      </SectionHeader>
    </Card>
  );
}

function formatDateRange(data: DailyProductStats[]): string {
  if (data.length === 0) return "";
  const first = new Date(data[0].date);
  const last = new Date(data[data.length - 1].date);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(first)} – ${fmt(last)}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}
