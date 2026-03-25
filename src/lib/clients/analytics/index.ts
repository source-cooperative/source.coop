// src/lib/clients/analytics/index.ts

import type { DailyProductStats, DailyAccountProductStats, Period } from "./types";

export type { DailyProductStats, DailyAccountProductStats, Period } from "./types";

const CF_ANALYTICS_ACCOUNT_ID = process.env.CF_ANALYTICS_ACCOUNT_ID;
const CF_ANALYTICS_API_TOKEN = process.env.CF_ANALYTICS_API_TOKEN;
const CF_ANALYTICS_DATASET = process.env.CF_ANALYTICS_DATASET ?? "source_data_proxy_production";

function isConfigured(): boolean {
  return !!(CF_ANALYTICS_ACCOUNT_ID && CF_ANALYTICS_API_TOKEN);
}

async function queryAnalyticsEngine<T>(sql: string): Promise<T[]> {
  if (!isConfigured()) {
    return [];
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ANALYTICS_ACCOUNT_ID}/analytics_engine/sql`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_ANALYTICS_API_TOKEN}`,
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
    FROM ${CF_ANALYTICS_DATASET}
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
    FROM ${CF_ANALYTICS_DATASET}
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

  return rows.map((row) => ({
    product_id: row.product_id,
    date: row.date,
    downloads: Number(row.downloads),
    bytes: Number(row.bytes),
  }));
}
