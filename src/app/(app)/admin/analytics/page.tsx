import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
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
// Components come from the client module; mono must come from the plain
// style module — client-module exports can't be called on the server.
import { MonoLabel } from "@/components/features/analytics/panels";
import { mono } from "@/components/features/analytics/style";
import { AdminFiltersForm } from "@/components/features/analytics/AdminFiltersForm";
import { GroupByChips } from "@/components/features/analytics/GroupByChips";
import { adminAnalyticsUrl, formatBytes } from "@/lib";
import { accountUrl } from "@/lib/urls";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminAnalyticsPage");
  return { title: t("metaTitle") };
}

type Translator = Awaited<
  ReturnType<typeof getTranslations<"AdminAnalyticsPage">>
>;

/** Message keys for the BUCKET_INTERVALS ladder, by minutes. */
const INTERVAL_KEY = {
  1: "minute",
  60: "hourly",
  360: "sixHour",
  1440: "daily",
  10080: "weekly",
} as const;

interface PageState {
  /**
   * UTC day "YYYY-MM-DD" (inclusive) or UTC instant "YYYY-MM-DDTHH:MM"
   * (as `to`: exclusive) from the datetime filters and chart drill-downs;
   * empty string = default
   */
  from: string;
  to: string;
  /** Sum interval in minutes (a BUCKET_INTERVALS value); undefined = auto */
  bucketMinutes?: number;
  /** Chart/ranking metric; "requests" is the default and stays out of URLs */
  metric: "bytes" | "requests";
  groupBy: AdminDimension[];
  /** Per-dimension value filters, one URL param per dimension key */
  filters: Partial<Record<AdminDimension, string>>;
}

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

const DAY_MS = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const todayUtc = () => new Date().setUTCHours(0, 0, 0, 0);

const dateParam = (v: string | string[] | undefined): string => {
  const value = first(v) ?? "";
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(value) ? value : "";
};

/** Parse a range param (day or instant) to ms; day-only = UTC day start. */
const paramMs = (value: string): number =>
  Date.parse(value.length === 10 ? `${value}T00:00:00Z` : `${value}:00Z`);

/** "15-minute" / "6-hour" / "3-day" for any ladder value. */
const bucketName = (t: Translator, minutes: number): string =>
  minutes < 60
    ? t("bucketMinutes", { n: minutes })
    : minutes < 1440
      ? t("bucketHours", { n: minutes / 60 })
      : t("bucketDays", { n: minutes / 1440 });

/** "6 hours" / "16 days" — the longest range an interval can draw. */
const spanName = (t: Translator, minutes: number): string =>
  minutes < 1440
    ? t("spanHours", { n: Math.floor(minutes / 60) })
    : t("spanDays", { n: Math.floor(minutes / 1440) });

// Whole weeks (plus "Today"), to avoid aliasing day-of-week patterns.
const PRESETS = [1, 7, 28, 91];

function parseState(params: Record<string, string | string[] | undefined>): PageState {
  const groupByParam = first(params.groupBy);
  const interval = Number(first(params.interval));
  return {
    from: dateParam(params.from),
    to: dateParam(params.to),
    bucketMinutes: BUCKET_INTERVALS.some((b) => b.minutes === interval)
      ? interval
      : undefined,
    metric: first(params.metric) === "bytes" ? "bytes" : "requests",
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
    filters: Object.fromEntries(
      (Object.keys(ADMIN_DIMENSIONS) as AdminDimension[])
        .map((dim) => [dim, first(params[dim])?.trim()])
        .filter(([, value]) => value),
    ),
  };
}

function pageUrl(state: PageState): string {
  const params = new URLSearchParams({ groupBy: state.groupBy.join(",") });
  if (state.from) params.set("from", state.from);
  if (state.to) params.set("to", state.to);
  if (state.bucketMinutes) params.set("interval", String(state.bucketMinutes));
  if (state.metric === "bytes") params.set("metric", state.metric);
  for (const [dim, value] of Object.entries(state.filters)) {
    params.set(dim, value);
  }
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
  const t = await getTranslations("AdminAnalyticsPage");
  const tStat = await getTranslations("AnalyticsPanels");
  const tHelp = await getTranslations("AnalyticsHelp");
  const format = await getFormatter();
  const dimensionOptions = (
    Object.keys(ADMIN_DIMENSIONS) as AdminDimension[]
  ).map((dim) => ({ key: dim, label: t(`dimensions.${dim}`) }));

  if (!isAnalyticsConfigured()) {
    return (
      <Flex direction="column" gap="4">
        <Heading size="4">{t("heading")}</Heading>
        <Callout.Root color="gray">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            {t("notConfigured", {
              vars: format.list([
                "CF_ANALYTICS_ACCOUNT_ID",
                "CF_ANALYTICS_API_TOKEN",
                "CF_ANALYTICS_DATASET",
              ]),
            })}
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
  // A drilled range may be time-grained ("…THH:MM", exclusive `to`); the
  // day-oriented controls operate on the days it touches.
  const today = todayUtc();
  const range = breakdown?.range ?? { from: isoDay(today - 6 * DAY_MS), to: isoDay(today) };
  const fromMs = paramMs(range.from);
  const endMs =
    range.to.length === 10 ? paramMs(range.to) + DAY_MS : paramMs(range.to);
  const fromDayMs = Math.floor(fromMs / DAY_MS) * DAY_MS;
  const lastDayMs = Math.floor((endMs - 1) / DAY_MS) * DAY_MS;
  const retentionEdge = today - RETENTION_DAYS * DAY_MS;
  const rangeDays = Math.round((lastDayMs - fromDayMs) / DAY_MS) + 1;
  const rangeMinutes = (endMs - fromMs) / 60_000;
  const rangeLabel = t("rangeDays", { days: rangeDays });
  // Shift the whole range by N days, clamped so its length is preserved at
  // the edges (today forward, ~retention backward). Shifting a drilled
  // sub-day range deliberately widens it back to whole days.
  const shiftUrl = (days: number) => {
    const deltaMs =
      days > 0
        ? Math.min(days * DAY_MS, today - lastDayMs)
        : Math.max(days * DAY_MS, retentionEdge - fromDayMs);
    return pageUrl({
      ...state,
      from: isoDay(fromDayMs + deltaMs),
      to: isoDay(lastDayMs + deltaMs),
    });
  };
  const atToday = lastDayMs >= today;
  const atRetention = fromDayMs <= retentionEdge;
  // Bandwidth denominator: elapsed wall-clock within the range — a range
  // that includes today only counts the part that has happened.
  const elapsedSeconds = Math.max(
    1,
    (Math.min(Date.now(), endMs) - fromMs) / 1000,
  );

  return (
    <Flex direction="column" gap="4">
      <Heading size="4">{t("heading")}</Heading>

      {/* Two zones: what data (dates + entity filters) | how it's drawn
          (group by + interval), split by the stats-row hairline. */}
      <Card size="2">
        <Flex gap="5" wrap="wrap">
          {/* flexBasis 0: zones split the row by ratio instead of claiming
              their content width, so GROUP BY/INTERVAL stay to the right
              (inner chip rows wrap within the zone); minWidth only forces
              stacking on truly narrow screens. */}
          <Flex
            direction="column"
            gap="3"
            style={{ flexGrow: 3, flexBasis: 0, minWidth: 300 }}
          >
            <Box>
              <Box mb="1">
                <MonoLabel>{t("dateRange")}</MonoLabel>
              </Box>
              <Flex gap="1" wrap="wrap" align="center">
                <ShiftButton
                  label="«"
                  help={t("backRange", { range: rangeLabel })}
                  disabled={atRetention}
                  href={shiftUrl(-rangeDays)}
                />
                <ShiftButton
                  label="‹"
                  help={t("backDay")}
                  disabled={atRetention}
                  href={shiftUrl(-1)}
                />
                {PRESETS.map((days) => {
                  const from = isoDay(today - (days - 1) * DAY_MS);
                  const to = isoDay(today);
                  const active = range.from === from && range.to === to;
                  return (
                    <Button
                      key={days}
                      asChild
                      size="1"
                      variant={active ? "solid" : "soft"}
                    >
                      <Link href={pageUrl({ ...state, from, to })}>
                        {days === 1
                          ? t("presetToday")
                          : t("presetDays", { days })}
                      </Link>
                    </Button>
                  );
                })}
                <ShiftButton
                  label="›"
                  help={t("forwardDay")}
                  disabled={atToday}
                  href={shiftUrl(1)}
                />
                <ShiftButton
                  label="»"
                  help={t("forwardRange", { range: rangeLabel })}
                  disabled={atToday}
                  href={shiftUrl(rangeDays)}
                />
              </Flex>
            </Box>
            <AdminFiltersForm
              // Remount on history traversal: the inputs hold client state,
              // so prop changes alone never reach them.
              key={`${range.from}|${range.to}|${JSON.stringify(state.filters)}`}
              action={adminAnalyticsUrl()}
              dimensions={dimensionOptions}
              defaults={{
                // datetime-local values over the resolved [from, end) —
                // midnight-aligned submissions collapse back to day grain
                // in the data layer.
                from: new Date(fromMs).toISOString().slice(0, 16),
                to: new Date(endMs).toISOString().slice(0, 16),
                filters: state.filters,
              }}
              hidden={{
                groupBy: state.groupBy.join(","),
                ...(state.bucketMinutes && {
                  interval: String(state.bucketMinutes),
                }),
                ...(state.metric === "bytes" && { metric: state.metric }),
              }}
            />
          </Flex>

          <Box
            width="1px"
            display={{ initial: "none", sm: "block" }}
            style={{ background: "var(--gray-4)" }}
          />

          <Flex
            direction="column"
            gap="3"
            style={{ flexGrow: 2, flexBasis: 0, minWidth: 260 }}
          >
            <Box>
              <Box mb="1">
                <MonoLabel>{t("groupBy")}</MonoLabel>
              </Box>
              <GroupByChips
                // Remount when the URL-derived selection changes (history
                // back/forward) — local chip state doesn't watch props.
                key={state.groupBy.join(",")}
                dimensions={dimensionOptions}
                selected={state.groupBy}
              />
            </Box>
            <Box>
              <Box mb="1">
                <MonoLabel>{t("interval")}</MonoLabel>
              </Box>
              <Flex gap="1" wrap="wrap">
                <Button
                  asChild
                  size="1"
                  variant={state.bucketMinutes === undefined ? "solid" : "soft"}
                >
                  <Link href={pageUrl({ ...state, bucketMinutes: undefined })}>
                    {t("auto")}
                  </Link>
                </Button>
                {BUCKET_INTERVALS.map((bucket) => {
                  const label = t(`intervals.${INTERVAL_KEY[bucket.minutes]}`);
                  // An interval that would draw more bars than the chart can
                  // hold is disabled rather than silently coarsened.
                  const fits =
                    rangeMinutes <= MAX_CHART_BUCKETS * bucket.minutes;
                  if (!fits) {
                    return (
                      <Tooltip
                        key={bucket.minutes}
                        content={t("intervalTooFine", {
                          interval: label,
                          span: spanName(t, MAX_CHART_BUCKETS * bucket.minutes),
                          range: rangeLabel,
                        })}
                      >
                        <Button size="1" variant="soft" disabled>
                          {label}
                        </Button>
                      </Tooltip>
                    );
                  }
                  return (
                    <Button
                      key={bucket.minutes}
                      asChild
                      size="1"
                      variant={state.bucketMinutes === bucket.minutes ? "solid" : "soft"}
                    >
                      <Link href={pageUrl({ ...state, bucketMinutes: bucket.minutes })}>
                        {label}
                      </Link>
                    </Button>
                  );
                })}
              </Flex>
            </Box>
          </Flex>
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
            {t("noTraffic", { from: range.from, to: range.to })}
          </Callout.Text>
        </Callout.Root>
      ) : (
        <>
          <Card size="2">
            {state.bucketMinutes !== undefined &&
              breakdown.bucketMinutes !== state.bucketMinutes && (
                <Text as="div" size="1" color="orange" mb="2">
                  {t("coarsened", {
                    bucket: bucketName(t, breakdown.bucketMinutes),
                    max: MAX_CHART_BUCKETS,
                  })}
                </Text>
              )}
            <AdminBreakdownChart
              buckets={breakdown.buckets}
              bucketMinutes={breakdown.bucketMinutes}
              initialMetric={state.metric}
              queries={breakdown.queries}
              series={breakdown.series}
              points={breakdown.points}
              totals={breakdown.totals}
              elapsedSeconds={elapsedSeconds}
              otherKey={OTHER_KEY}
            />
          </Card>

          <Table.Root size="1" variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell width="1%">
                  <MonoLabel>#</MonoLabel>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>
                  <MonoLabel>
                    {state.groupBy.length
                      ? state.groupBy
                          .map((d) => t(`dimensions.${d}`))
                          .join(" · ")
                      : t("scope")}
                  </MonoLabel>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end">
                  <MonoLabel help={tHelp("served")}>
                    {tStat("dataServed")}
                  </MonoLabel>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end">
                  <MonoLabel help={tHelp("requests")}>
                    {tStat("requests")}
                  </MonoLabel>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>
                  <MonoLabel>{t("share")}</MonoLabel>
                </Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {breakdown.groups.map((group, index) => {
                // Share follows the active metric, like the row order.
                const share = breakdown.totals[state.metric]
                  ? (group[state.metric] / breakdown.totals[state.metric]) * 100
                  : 0;
                const color = seriesColors.get(group.key);
                const href = groupHref(group.key, state.groupBy);
                return (
                  // align="center": the swatch/meter cells hold block-level
                  // Flexes that otherwise top-align against the text cells.
                  <Table.Row key={group.key} align="center">
                    <Table.Cell justify="end">
                      <Text size="1" color="gray" style={mono()}>
                        {/* The Other remainder isn't a ranked group */}
                        {group.key === OTHER_KEY ? "" : index + 1}
                      </Text>
                    </Table.Cell>
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
                        <Text size="1" style={mono()}>
                          {href ? (
                            <Link href={href}>{group.key}</Link>
                          ) : group.key === OTHER_KEY ? (
                            t("other")
                          ) : (
                            group.key
                          )}
                        </Text>
                      </Flex>
                    </Table.RowHeaderCell>
                    <Table.Cell justify="end">
                      <Text size="1" style={mono()}>
                        {formatBytes(group.bytes)}
                      </Text>
                    </Table.Cell>
                    <Table.Cell justify="end">
                      <Text size="1" style={mono()}>
                        {format.number(Math.round(group.requests))}
                      </Text>
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
                        <Text size="1" color="gray" style={mono()}>
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
