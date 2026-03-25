"use client";

import { Card, Flex } from "@radix-ui/themes";
import { SparklineChart } from "./SparklineChart";
import { PeriodSelector } from "./PeriodSelector";
import { SectionHeader } from "@/components/core/SectionHeader";
import type { DailyProductStats, Period } from "@/lib/clients/analytics";

interface ProductAnalyticsProps {
  data: DailyProductStats[];
  period: Period;
}

export function ProductAnalytics({ data, period }: ProductAnalyticsProps) {
  if (data.length === 0) return null;

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
