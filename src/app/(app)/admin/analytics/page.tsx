import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPageSession } from "@/lib";
import { isAdmin } from "@/lib/api/authz";
import {
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Heading,
  Table,
  Text,
  Tooltip,
} from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import {
  ADMIN_DIMENSIONS,
  BUCKET_INTERVALS,
  MAX_CHART_BUCKETS,
  OTHER_KEY,
  RETENTION_DAYS,
  getAdminBreakdown,
  isAnalyticsConfigured,
  type AdminBreakdown,
  type AdminDimension,
} from "@/lib/clients/analytics";
import {
  AdminBreakdownChart,
  seriesColor,
} from "@/components/features/analytics";
import { HELP, Stat } from "@/components/features/analytics/panels";
import { AdminFiltersForm } from "@/components/features/analytics/AdminFiltersForm";
import { GroupByChips } from "@/components/features/analytics/GroupByChips";
import { adminAnalyticsUrl, formatBytes } from "@/lib";
import { accountUrl } from "@/lib/urls";

export const metadata: Metadata = { title: "Admin — Analytics" };

interface PageState {
  /** UTC days, YYYY-MM-DD, inclusive; empty string = default */
  from: string;
  to: string;
  /** Sum interval in hours (a BUCKET_INTERVALS value); undefined = auto */
  bucketHours?: number;
  /** Chart metric toggle; "bytes" is the default and stays out of URLs */
  metric: "bytes" | "requests";
  groupBy: AdminDimension[];
  account?: string;
  product?: string;
}

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

const numberFormat = new Intl.NumberFormat("en-US");

const DAY_MS = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const todayUtc = () => new Date().setUTCHours(0, 0, 0, 0);

const dateParam = (v: string | string[] | undefined): string => {
  const value = first(v) ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
};

// Whole weeks (plus "Today"), to avoid aliasing day-of-week patterns.
const PRESETS = [
  { label: "Today", days: 1 },
  { label: "7d", days: 7 },
  { label: "28d", days: 28 },
  { label: "91d", days: 91 },
];

function parseState(params: Record<string, string | string[] | undefined>): PageState {
  const groupByParam = first(params.groupBy);
  const interval = Number(first(params.interval));
  return {
    from: dateParam(params.from),
    to: dateParam(params.to),
    bucketHours: BUCKET_INTERVALS.some((b) => b.hours === interval)
      ? interval
      : undefined,
    metric: first(params.metric) === "requests" ? "requests" : "bytes",
    // Absent → the default grouping; present but empty → no grouping at all.
    groupBy:
      groupByParam === undefined
        ? ["product"]
        : [
            ...new Set(
              groupByParam
                .split(",")
                // Object.hasOwn, not `in`: ?groupBy=constructor must not
                // match prototype keys.
                .filter((d): d is AdminDimension =>
                  Object.hasOwn(ADMIN_DIMENSIONS, d),
                ),
            ),
          ],
    account: first(params.account)?.trim() || undefined,
    product: first(params.product)?.trim() || undefined,
  };
}

function pageUrl(state: PageState): string {
  const params = new URLSearchParams({ groupBy: state.groupBy.join(",") });
  if (state.from) params.set("from", state.from);
  if (state.to) params.set("to", state.to);
  if (state.bucketHours) params.set("interval", String(state.bucketHours));
  if (state.metric === "requests") params.set("metric", state.metric);
  if (state.account) params.set("account", state.account);
  if (state.product) params.set("product", state.product);
  return `${adminAnalyticsUrl()}?${params}`;
}

/** Range-shift arrow: a tooltipped link button, inert when at a boundary. */
function ShiftButton({
  label,
  help,
  href,
  disabled,
}: {
  label: string;
  help: string;
  href: string;
  disabled: boolean;
}) {
  const button = disabled ? (
    <Button size="1" variant="soft" disabled>
      {label}
    </Button>
  ) : (
    <Button size="1" variant="soft" asChild>
      <Link href={href} aria-label={help}>
        {label}
      </Link>
    </Button>
  );
  return <Tooltip content={help}>{button}</Tooltip>;
}

/** Product/account group keys double as site paths ("acct" or "acct/prod"). */
function groupHref(key: string, groupBy: AdminDimension[]): string | null {
  if (key === OTHER_KEY || groupBy.length !== 1) return null;
  if (groupBy[0] === "account" || groupBy[0] === "product") {
    return accountUrl(key); // "/{key}" — product keys already include the slash
  }
  return null;
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  // The admin layout renders NotAuthorizedPage, but layouts aren't an auth
  // boundary (they render in parallel with pages and don't re-render on
  // soft navigation) — gate the data work here too.
  if (!isAdmin(await getPageSession())) {
    notFound();
  }

  const state = parseState(await searchParams);

  if (!isAnalyticsConfigured()) {
    return (
      <Flex direction="column" gap="4">
        <Heading size="4">Analytics</Heading>
        <Callout.Root color="gray">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Analytics is not configured. Set CF_ANALYTICS_ACCOUNT_ID,
            CF_ANALYTICS_API_TOKEN, and CF_ANALYTICS_DATASET.
          </Callout.Text>
        </Callout.Root>
      </Flex>
    );
  }

  let breakdown: AdminBreakdown | null = null;
  let queryError: string | null = null;
  try {
    breakdown = await getAdminBreakdown(state);
  } catch (error) {
    queryError = error instanceof Error ? error.message : String(error);
  }

  const seriesColors = new Map(
    breakdown?.series.map((key, i) => [key, seriesColor(key, i, OTHER_KEY)]),
  );

  // The resolved (clamped) range drives the presets, shift arrows, and the
  // date inputs' defaults; fall back to the same default the client uses.
  const today = todayUtc();
  const range = breakdown?.range ?? { from: isoDay(today - 6 * DAY_MS), to: isoDay(today) };
  const fromMs = Date.parse(`${range.from}T00:00:00Z`);
  const toMs = Date.parse(`${range.to}T00:00:00Z`);
  const retentionEdge = today - RETENTION_DAYS * DAY_MS;
  const rangeDays = Math.round((toMs - fromMs) / DAY_MS) + 1;
  const rangeLabel = `${rangeDays} day${rangeDays === 1 ? "" : "s"}`;
  // Shift the whole range by N days, clamped so its length is preserved at
  // the edges (today forward, ~retention backward).
  const shiftUrl = (days: number) => {
    const deltaMs =
      days > 0
        ? Math.min(days * DAY_MS, today - toMs)
        : Math.max(days * DAY_MS, retentionEdge - fromMs);
    return pageUrl({
      ...state,
      from: isoDay(fromMs + deltaMs),
      to: isoDay(toMs + deltaMs),
    });
  };
  const atToday = toMs >= today;
  const atRetention = fromMs <= retentionEdge;
  // Bandwidth denominator: elapsed wall-clock within the range — a range
  // that includes today only counts the part that has happened.
  const elapsedSeconds = Math.max(
    1,
    (Math.min(Date.now(), toMs + DAY_MS) - fromMs) / 1000,
  );

  return (
    <Flex direction="column" gap="4">
      <Heading size="4">Analytics</Heading>

      <Card size="2">
        <Flex direction="column" gap="3">
          <Flex gap="4" wrap="wrap">
            <Box>
              <Text as="div" size="1" color="gray" mb="1">
                Date range (UTC)
              </Text>
              <Flex gap="1" wrap="wrap" align="center">
                <ShiftButton
                  label="«"
                  help={`Back ${rangeLabel} (the shown range)`}
                  disabled={atRetention}
                  href={shiftUrl(-rangeDays)}
                />
                <ShiftButton
                  label="‹"
                  help="Back 1 day"
                  disabled={atRetention}
                  href={shiftUrl(-1)}
                />
                {PRESETS.map((preset) => {
                  const from = isoDay(today - (preset.days - 1) * DAY_MS);
                  const to = isoDay(today);
                  const active = range.from === from && range.to === to;
                  return (
                    <Button
                      key={preset.label}
                      asChild
                      size="1"
                      variant={active ? "solid" : "soft"}
                    >
                      <Link href={pageUrl({ ...state, from, to })}>
                        {preset.label}
                      </Link>
                    </Button>
                  );
                })}
                <ShiftButton
                  label="›"
                  help="Forward 1 day"
                  disabled={atToday}
                  href={shiftUrl(1)}
                />
                <ShiftButton
                  label="»"
                  help={`Forward ${rangeLabel} (the shown range)`}
                  disabled={atToday}
                  href={shiftUrl(rangeDays)}
                />
              </Flex>
            </Box>
            <Box>
              <Text as="div" size="1" color="gray" mb="1">
                Group by
              </Text>
              <GroupByChips
                dimensions={(
                  Object.keys(ADMIN_DIMENSIONS) as AdminDimension[]
                ).map((dim) => ({
                  key: dim,
                  label: ADMIN_DIMENSIONS[dim].label,
                }))}
                selected={state.groupBy}
              />
            </Box>
            <Box>
              <Text as="div" size="1" color="gray" mb="1">
                Interval
              </Text>
              <Flex gap="1" wrap="wrap">
                <Button
                  asChild
                  size="1"
                  variant={state.bucketHours === undefined ? "solid" : "soft"}
                >
                  <Link href={pageUrl({ ...state, bucketHours: undefined })}>
                    Auto
                  </Link>
                </Button>
                {BUCKET_INTERVALS.map((bucket) => {
                  // An interval that would draw more bars than the chart can
                  // hold is disabled rather than silently coarsened.
                  const maxDays = Math.floor(
                    (MAX_CHART_BUCKETS * bucket.hours) / 24,
                  );
                  const fits = rangeDays <= maxDays;
                  if (!fits) {
                    return (
                      <Tooltip
                        key={bucket.hours}
                        content={`${bucket.label} buckets fit ranges up to ${maxDays} days — this range spans ${rangeDays}`}
                      >
                        <Button size="1" variant="soft" disabled>
                          {bucket.label}
                        </Button>
                      </Tooltip>
                    );
                  }
                  return (
                    <Button
                      key={bucket.hours}
                      asChild
                      size="1"
                      variant={state.bucketHours === bucket.hours ? "solid" : "soft"}
                    >
                      <Link href={pageUrl({ ...state, bucketHours: bucket.hours })}>
                        {bucket.label}
                      </Link>
                    </Button>
                  );
                })}
              </Flex>
            </Box>
          </Flex>

          <AdminFiltersForm
            action={adminAnalyticsUrl()}
            defaults={{
              from: range.from,
              to: range.to,
              account: state.account ?? "",
              product: state.product ?? "",
            }}
            hidden={{
              groupBy: state.groupBy.join(","),
              ...(state.bucketHours && {
                interval: String(state.bucketHours),
              }),
              ...(state.metric === "requests" && { metric: state.metric }),
            }}
          />
        </Flex>
      </Card>

      {queryError ? (
        <Callout.Root color="red" role="alert">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{queryError}</Callout.Text>
        </Callout.Root>
      ) : !breakdown ||
        (breakdown.totals.bytes === 0 && breakdown.totals.requests === 0) ? (
        <Callout.Root color="gray">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            No traffic recorded for this selection between {range.from} and{" "}
            {range.to}.
          </Callout.Text>
        </Callout.Root>
      ) : (
        <>
          <Card size="2">
            <Flex
              mb="4"
              pb="3"
              style={{ borderBottom: "1px solid var(--gray-4)" }}
            >
              <Stat
                label="Requests"
                help={HELP.requests}
                value={numberFormat.format(Math.round(breakdown.totals.requests))}
              />
              <Stat
                label="Data served"
                help={HELP.served}
                value={formatBytes(breakdown.totals.bytes, 1)}
                divider
              />
              <Stat
                label="Avg bandwidth"
                help={HELP.bandwidth}
                value={`${formatBytes(breakdown.totals.bytes / elapsedSeconds, 1)}/s`}
                divider
              />
              <Stat
                label="Unique IPs"
                help={HELP.uniqueIps}
                value={numberFormat.format(breakdown.totals.uniqueIps)}
                divider
              />
              <Stat
                label="Countries"
                help={HELP.countries}
                value={numberFormat.format(breakdown.totals.countries)}
                divider
              />
            </Flex>
            {state.bucketHours !== undefined &&
              breakdown.bucketHours !== state.bucketHours && (
                <Text as="div" size="1" color="orange" mb="2">
                  Showing {breakdown.bucketHours}-hour buckets — the requested
                  interval would draw more than {MAX_CHART_BUCKETS} bars over
                  this range.
                </Text>
              )}
            <AdminBreakdownChart
              buckets={breakdown.buckets}
              bucketHours={breakdown.bucketHours}
              range={breakdown.range}
              initialMetric={state.metric}
              queries={breakdown.queries}
              series={breakdown.series}
              points={breakdown.points}
              totals={breakdown.totals}
              otherKey={OTHER_KEY}
            />
          </Card>

          <Table.Root size="1" variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>
                  {state.groupBy.length
                    ? state.groupBy
                        .map((d) => ADMIN_DIMENSIONS[d].label)
                        .join(" · ")
                    : "Scope"}
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end">
                  Data served
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end">
                  Requests
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Share</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {breakdown.groups.map((group) => {
                const share = breakdown.totals.bytes
                  ? (group.bytes / breakdown.totals.bytes) * 100
                  : 0;
                const color = seriesColors.get(group.key);
                const href = groupHref(group.key, state.groupBy);
                return (
                  <Table.Row key={group.key}>
                    <Table.RowHeaderCell>
                      <Flex align="center" gap="2">
                        <Box
                          width="10px"
                          height="10px"
                          flexShrink="0"
                          style={{
                            background: color ?? "var(--gray-4)",
                          }}
                        />
                        {href ? (
                          <Link href={href}>{group.key}</Link>
                        ) : (
                          group.key
                        )}
                      </Flex>
                    </Table.RowHeaderCell>
                    <Table.Cell justify="end">
                      {formatBytes(group.bytes)}
                    </Table.Cell>
                    <Table.Cell justify="end">
                      {numberFormat.format(Math.round(group.requests))}
                    </Table.Cell>
                    <Table.Cell>
                      <Flex align="center" gap="2">
                        <Box
                          height="8px"
                          width="96px"
                          flexShrink="0"
                          style={{ background: "var(--gray-a3)" }}
                        >
                          <Box
                            height="8px"
                            style={{
                              width: `${Math.min(100, share)}%`,
                              background: color ?? "var(--gray-8)",
                            }}
                          />
                        </Box>
                        <Text size="1" color="gray">
                          {share.toFixed(1)}%
                        </Text>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </>
      )}
    </Flex>
  );
}
