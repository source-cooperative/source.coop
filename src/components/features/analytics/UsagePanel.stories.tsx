import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card } from "@radix-ui/themes";
import { SectionHeader } from "@/components/core/SectionHeader";
import type { UsagePoint, UsageTotals } from "@/lib/clients/analytics";
import { MonoLabel } from "./panels";
import { HELP } from "./style";
import { UsagePanel } from "./UsagePanel";

/**
 * The analytics card on a product page — downloads, data served, countries,
 * over a daily bar chart. Every viewer sees it, signed in or not.
 *
 * `UsageCard`, the thing actually mounted in the product layout, is an async
 * server component whose first line awaits `getUsage`, so it cannot have
 * stories of its own. The decorator below reproduces its chrome — the Card
 * and the SectionHeader with the day count — around the panel that does all
 * the rendering, which is as close to the real card as a browser can get.
 *
 * Each state here is a different product's traffic, and in the app you would
 * have to find such a product to see it: one with no downloads at all, one
 * that got linked from somewhere big on a single day, one serving petabytes.
 * Hovering a bar swaps the stats row to that day — that part is live here.
 */
const meta = {
  component: UsagePanel,
  title: "Features/Analytics/UsagePanel",
  parameters: { layout: "padded" },
  decorators: [
    (Story, context) => (
      <Card size={{ initial: "2", sm: "1" }} style={{ flexShrink: 0 }}>
        <SectionHeader
          title="Analytics"
          rightButton={
            <MonoLabel help={HELP.window}>
              {(context.args.days as UsagePoint[]).length} days
            </MonoLabel>
          }
        >
          <Story />
        </SectionHeader>
      </Card>
    ),
  ],
} satisfies Meta<typeof UsagePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// A fixed "today" rather than Date.now(): the axis labels are part of what a
// reviewer is checking, and they should not move between two runs.
const TODAY = Date.UTC(2026, 7, 31);
const DAY_MS = 86_400_000;

/** ISO UTC day start, `back` days before the last day of the window. */
const dayStart = (index: number, length: number) =>
  new Date(TODAY - (length - 1 - index) * DAY_MS).toISOString();

/**
 * Deterministic wobble in [0, 1]. Real traffic is neither flat nor random,
 * and a story that reshuffles itself on reload is useless for spotting a
 * chart regression — two sines beat both.
 */
const wobble = (i: number, seed = 0) =>
  (Math.sin(i * 1.7 + seed) + Math.sin(i * 0.41 + seed) + 2) / 4;

/** A window of days from a per-day downloads function. */
function makeDays(
  length: number,
  requestsAt: (i: number) => number,
  bytesPerRequest = 41_000_000,
): UsagePoint[] {
  return Array.from({ length }, (_, i) => {
    const requests = Math.round(requestsAt(i));
    return {
      date: dayStart(i, length),
      requests,
      bytes: requests * bytesPerRequest,
      // Countries track volume loosely and plateau — a busy day is not a day
      // when forty new countries appeared.
      countries: requests === 0 ? 0 : Math.min(48, 3 + Math.round(requests / 90)),
    };
  });
}

/** Totals are the window's sums, except countries, which is a distinct count. */
function totalsOf(days: UsagePoint[], countries: number): UsageTotals {
  return {
    requests: days.reduce((sum, d) => sum + d.requests, 0),
    bytes: days.reduce((sum, d) => sum + d.bytes, 0),
    countries,
  };
}

const steady = makeDays(28, (i) => 180 + wobble(i) * 260);

/** A product with regular traffic — the shape most cards have. */
export const Default: Story = {
  args: { days: steady, totals: totalsOf(steady, 37) },
};

const quiet = makeDays(28, () => 0);

/**
 * Published but never downloaded. The card still renders — an empty chart and
 * three zeros, rather than the card hiding itself, which is what `null` from
 * `getUsage` (unconfigured or failed) does instead.
 */
export const NoDownloads: Story = {
  args: { days: quiet, totals: totalsOf(quiet, 0) },
};

const spike = makeDays(28, (i) =>
  // One day of front-page traffic, two orders of magnitude over the baseline.
  i === 21 ? 24_000 : 60 + wobble(i, 2) * 90,
);

/**
 * Linked from somewhere large on one day. The interesting part is the other
 * 27 bars: on a linear axis they are one pixel of nothing next to the spike,
 * which is the honest rendering but worth looking at deliberately.
 */
export const TrafficSpike: Story = {
  args: { days: spike, totals: totalsOf(spike, 92) },
};

const petabyte = makeDays(
  28,
  (i) => 140_000 + wobble(i, 5) * 90_000,
  2_400_000_000,
);

/**
 * A heavily used product, to check the stats row survives numbers that are
 * wide in every column at once — six-figure downloads beside petabytes.
 */
export const HighVolume: Story = {
  args: { days: petabyte, totals: totalsOf(petabyte, 148) },
};

const week = makeDays(7, (i) => 210 + wobble(i, 3) * 140);

/**
 * Seven days rather than 28. The card is pinned to `USAGE_DAYS` in the app,
 * so this window is only reachable through the full analytics page — but the
 * panel is the same one, and it has to hold up with a quarter of the bars.
 */
export const ShortWindow: Story = {
  args: { days: week, totals: totalsOf(week, 19) },
};

/**
 * The card at phone width, where the stats row has to give up its single
 * line. The metrics reflow onto a second row rather than running off the side
 * of the card, and the hairline dividers still fall only between neighbours —
 * never down the left edge of a row.
 *
 * Worth reading next to `HighVolume`, whose numbers these are: the widest
 * value in the row is what decides how many metrics fit across.
 */
export const Mobile: Story = {
  args: HighVolume.args,
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
