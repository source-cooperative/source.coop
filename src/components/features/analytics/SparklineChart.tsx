"use client";

import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import type { DailyProductStats } from "@/lib/clients/analytics";

interface SparklineChartProps {
  data: DailyProductStats[];
  dataKey: "downloads" | "bytes";
  label: string;
  total: string;
  dateRange: string;
}

export function SparklineChart({
  data,
  dataKey,
  label,
  total,
  dateRange,
}: SparklineChartProps) {
  return (
    <Box>
      <Flex direction="column" gap="1">
        <Text size="1" color="gray">
          {label} &middot; {dateRange}
        </Text>
        <Heading size="5">{total}</Heading>
      </Flex>
      <Box mt="2" style={{ width: "100%", height: 48 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-9)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--accent-9)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid var(--gray-6)",
                background: "var(--color-panel)",
              }}
              labelFormatter={(label) => {
                const d = new Date(label);
                return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
              }}
              formatter={(value) => {
                const num = typeof value === "number" ? value : 0;
                return dataKey === "bytes"
                  ? [formatBytes(num), "Bytes"]
                  : [num.toLocaleString(), "Downloads"];
              }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke="var(--accent-9)"
              strokeWidth={1.5}
              fill={`url(#gradient-${dataKey})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}
