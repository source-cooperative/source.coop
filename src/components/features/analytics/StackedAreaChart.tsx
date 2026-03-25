"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Box, Heading } from "@radix-ui/themes";
import type { DailyAccountProductStats } from "@/lib/clients/analytics";

const COLORS = [
  "var(--accent-9)",
  "var(--cyan-9)",
  "var(--orange-9)",
  "var(--green-9)",
  "var(--pink-9)",
  "var(--yellow-9)",
  "var(--blue-9)",
  "var(--red-9)",
];

interface StackedAreaChartProps {
  data: DailyAccountProductStats[];
  dataKey: "downloads" | "bytes";
  label: string;
}

interface PivotedRow {
  date: string;
  [productId: string]: string | number;
}

export function StackedAreaChart({ data, dataKey, label }: StackedAreaChartProps) {
  if (data.length === 0) return null;

  const productIds = [...new Set(data.map((d) => d.product_id))];

  const byDate = new Map<string, PivotedRow>();
  for (const row of data) {
    if (!byDate.has(row.date)) {
      byDate.set(row.date, { date: row.date });
    }
    byDate.get(row.date)![row.product_id] = row[dataKey];
  }

  const pivoted = [...byDate.values()].map((row) => {
    for (const pid of productIds) {
      if (!(pid in row)) row[pid] = 0;
    }
    return row;
  });

  return (
    <Box>
      <Heading size="3" mb="3">
        {label}
      </Heading>
      <Box style={{ width: "100%", height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={pivoted} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(val) => {
                const d = new Date(val);
                return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
              }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(val) =>
                dataKey === "bytes" ? formatBytesShort(val) : val.toLocaleString()
              }
              width={60}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid var(--gray-6)",
                background: "var(--color-panel)",
              }}
              labelFormatter={(label) => {
                const d = new Date(label);
                return d.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
              }}
              formatter={(value, name) => [
                typeof value === "number"
                  ? dataKey === "bytes"
                    ? formatBytes(value)
                    : value.toLocaleString()
                  : String(value ?? ""),
                String(name ?? ""),
              ]}
            />
            <Legend />
            {productIds.map((pid, i) => (
              <Area
                key={pid}
                type="monotone"
                dataKey={pid}
                stackId="1"
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.4}
                isAnimationActive={false}
              />
            ))}
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

function formatBytesShort(bytes: number): string {
  if (bytes === 0) return "0";
  const units = ["B", "K", "M", "G", "T"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(0)}${units[i]}`;
}
