import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  FREQUENCY_BINS,
  type ProductBreakdowns,
  type UsagePoint,
  type UsageTotals,
  type UsageUsers,
} from "@/lib/clients/analytics";
import { ProductAnalyticsView } from "./ProductAnalyticsView";

/**
 * The body of the product analytics page, behind the manager-only ANALYTICS
 * tab: stats over a downloads chart, a by-country ranking, and a top-files
 * table, with audience numbers on the USERS tab.
 *
 * Reaching this in the app takes a product you can manage, 28 days of real
 * traffic against it, and a working Analytics Engine token — which is why the
 * states that matter here are the ones nobody sees until a user reports them.
 * `breakdowns` arriving as `null` while the day series is fine is the big one:
 * it is a separate query, it fails on its own, and the page has to degrade to
 * a sentence rather than to an empty panel.
 *
 * The USERS tab is one click away in every story below.
 */
const meta = {
  component: ProductAnalyticsView,
  title: "Features/Analytics/ProductAnalyticsView",
  parameters: { layout: "padded" },
  args: { accountId: "miskatonic", productId: "abyssal-acoustics" },
} satisfies Meta<typeof ProductAnalyticsView>;

export default meta;
type Story = StoryObj<typeof meta>;

// Fixed, so the axis labels do not move between two runs.
const TODAY = Date.UTC(2026, 7, 31);
const DAY_MS = 86_400_000;

const wobble = (i: number, seed = 0) =>
  (Math.sin(i * 1.7 + seed) + Math.sin(i * 0.41 + seed) + 2) / 4;

function makeDays(
  length: number,
  requestsAt: (i: number) => number,
): UsagePoint[] {
  return Array.from({ length }, (_, i) => {
    const requests = Math.round(requestsAt(i));
    return {
      date: new Date(TODAY - (length - 1 - i) * DAY_MS).toISOString(),
      requests,
      bytes: requests * 41_000_000,
      countries:
        requests === 0 ? 0 : Math.min(48, 3 + Math.round(requests / 90)),
    };
  });
}

const totalsOf = (days: UsagePoint[], countries: number): UsageTotals => ({
  requests: days.reduce((sum, d) => sum + d.requests, 0),
  bytes: days.reduce((sum, d) => sum + d.bytes, 0),
  countries,
});

/**
 * A heavy-tailed downloads-per-IP histogram: most addresses take one file, a
 * few mirror the whole product. The real `distribution` is zero-filled across
 * every bin, so this builds from FREQUENCY_BINS rather than from a written-out
 * list that would drift if the bins changed.
 */
const distribution = (ipsAt: (index: number) => number) =>
  FREQUENCY_BINS.map((bin, i) => ({
    label: bin.label,
    ips: Math.round(ipsAt(i)),
  }));

const users: UsageUsers = {
  uniqueIps: 3_412,
  registered: 2_180,
  anonRequests: 6_940,
  distribution: distribution((i) => 2_400 / Math.pow(1.9, i)),
};

const breakdowns: ProductBreakdowns = {
  countries: [
    { code: "US", name: "United States", requests: 4_210 },
    { code: "DE", name: "Germany", requests: 1_880 },
    { code: "GB", name: "United Kingdom", requests: 1_140 },
    { code: "JP", name: "Japan", requests: 760 },
    { code: "BR", name: "Brazil", requests: 402 },
  ],
  otherCountries: { count: 32, requests: 1_290 },
  files: [
    { path: "catalog.parquet", requests: 3_120, bytes: 150_396_837_440 },
    {
      path: "derived/detections.parquet",
      requests: 1_884,
      bytes: 15_849_474_048,
    },
    { path: "README.md", requests: 1_402, bytes: 3_000_280 },
    {
      path: "recordings/2019/site-a-20190712-0800.flac",
      requests: 640,
      bytes: 78_643_200_000,
    },
    {
      path: "derived/spectrograms/site-a-20190712.png",
      requests: 318,
      bytes: 700_922_880,
    },
  ],
};

const steady = makeDays(28, (i) => 180 + wobble(i) * 260);
const base = { days: steady, totals: totalsOf(steady, 37), users, breakdowns };

/** A managed product with a month of ordinary traffic. */
export const Default: Story = { args: base };

/**
 * The country and top-files queries failed while the day series succeeded —
 * `getProductBreakdowns` returns `null` on its own. Both panels fall back to a
 * line of explanation, which is the point of the state: the page still says
 * something rather than showing two empty boxes.
 */
export const BreakdownsUnavailable: Story = {
  args: { ...base, breakdowns: null },
};

/**
 * Downloads happened, but none of them resolved to a file — the country
 * ranking is populated and the table is not. The two panels come from one
 * query but render independently, so it is worth knowing the layout holds.
 */
export const NoFileDownloads: Story = {
  args: { ...base, breakdowns: { ...breakdowns, files: [] } },
};

/**
 * One country and no "others" row, against paths long enough to need
 * truncating. Deep prefixes are normal for this kind of product, and the file
 * column is the narrowest thing on the page.
 */
export const LongPathsOneCountry: Story = {
  args: {
    ...base,
    breakdowns: {
      countries: [{ code: "US", name: "United States", requests: 4_210 }],
      otherCountries: null,
      files: [
        {
          path: "recordings/site-a-hydrophone-array/continuous-passive-acoustic-monitoring/20190712T080000Z-to-20190712T090000Z.flac",
          requests: 812,
          bytes: 99_774_464_000,
        },
        { path: "a.txt", requests: 4, bytes: 4 },
        { path: "full-archive.tar", requests: 2, bytes: 8_796_093_022_208 },
      ],
    },
  },
};

const quiet = makeDays(28, () => 0);

/**
 * A managed product with nothing to report. Every number is zero, and the
 * daily average divides by a full window rather than by the number of days
 * that saw traffic — which is the arithmetic worth eyeballing here.
 */
export const NoTraffic: Story = {
  args: {
    ...base,
    days: quiet,
    totals: totalsOf(quiet, 0),
    users: {
      uniqueIps: 0,
      registered: 0,
      anonRequests: 0,
      distribution: distribution(() => 0),
    },
    breakdowns: { countries: [], otherCountries: null, files: [] },
  },
};

const week = makeDays(7, (i) => 210 + wobble(i, 3) * 140);

/** The 7-day window, the narrowest the page offers. */
export const SevenDayWindow: Story = {
  args: { ...base, days: week, totals: totalsOf(week, 19) },
};
