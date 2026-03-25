// src/lib/clients/analytics/index.ts

import type { DailyProductStats, DailyAccountProductStats, Period } from "./types";
import { LOGGER } from "@/lib";
import { CONFIG } from "@/lib/config";

export type { DailyProductStats, DailyAccountProductStats, Period } from "./types";

async function queryAnalyticsEngine<T>(sql: string): Promise<T[]> {
  const isConfigured = !!(CONFIG.analytics.accountId && CONFIG.analytics.apiToken);
  if (!isConfigured) {
    LOGGER.warn("Analytics engine not configured", {
      operation: "queryAnalyticsEngine",
      context: "checking configuration",
      metadata: CONFIG.analytics,
    });
    console.warn("Analytics engine not configured.");
    return [];
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CONFIG.analytics.accountId}/analytics_engine/sql`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.analytics.apiToken}`,
      },
      body: sql,
      next: { revalidate: 3600 }, // Cache for 1 hour
    }
  );

  if (!response.ok) {
    console.error(`Analytics Engine query failed: ${response.status} ${response.statusText}`);
    return [];
  }

  const result = await response.json();
  return (result.data ?? []) as T[];
}

export async function getProductAnalytics(
  accountId: string,
  productId: string,
  days: Period = 7
): Promise<DailyProductStats[]> {
  const sql = `
    SELECT
      toStartOfInterval(timestamp, INTERVAL '1' DAY) AS date,
      COUNT() AS downloads,
      SUM(double1) AS bytes
    FROM ${CONFIG.analytics.dataset}
    WHERE blob1 = '${accountId}'
      AND blob2 = '${productId}'
      AND timestamp >= NOW() - INTERVAL '${days}' DAY
    GROUP BY date
    ORDER BY date
  `;

  const rows = await queryAnalyticsEngine<{
    date: string;
    downloads: number;
    bytes: number;
  }>(sql);

  LOGGER.debug("Queried data", {
    operation: "getProductAnalytics",
    context: "get product analytics",
    metadata: { sql, rows },
  });

  return rows.map((row) => ({
    date: row.date,
    downloads: Number(row.downloads),
    bytes: Number(row.bytes),
  }));
}

export async function getAccountAnalytics(
  accountId: string,
  days: Period = 7
): Promise<DailyAccountProductStats[]> {
  const sql = `
    SELECT
      blob2 AS product_id,
      toStartOfInterval(timestamp, INTERVAL '1' DAY) AS date,
      COUNT() AS downloads,
      SUM(double1) AS bytes
    FROM ${CONFIG.analytics.dataset}
    WHERE blob1 = '${accountId}'
      AND timestamp >= NOW() - INTERVAL '${days}' DAY
    GROUP BY product_id, date
    ORDER BY date
  `;

  const rows = await queryAnalyticsEngine<{
    product_id: string;
    date: string;
    downloads: number;
    bytes: number;
  }>(sql);

  LOGGER.debug("Queried data", {
    operation: "getAccountAnalytics",
    context: "get account analytics",
    metadata: { sql, rows },
  });

  return rows.map((row) => ({
    product_id: row.product_id,
    date: row.date,
    downloads: Number(row.downloads),
    bytes: Number(row.bytes),
  }));
}
