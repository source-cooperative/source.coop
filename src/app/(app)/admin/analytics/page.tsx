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
  TextField,
} from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import {
  ADMIN_DIMENSIONS,
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
import { adminAnalyticsUrl, formatBytes } from "@/lib";
import { accountUrl } from "@/lib/urls";

export const metadata: Metadata = { title: "Admin — Analytics" };

interface PageState {
  /** UTC days, YYYY-MM-DD, inclusive; empty string = default */
  from: string;
  to: string;
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
  return {
    from: dateParam(params.from),
    to: dateParam(params.to),
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
  if (state.account) params.set("account", state.account);
  if (state.product) params.set("product", state.product);
  return `${adminAnalyticsUrl()}?${params}`;
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
  const rangeDays = Math.round((toMs - fromMs) / DAY_MS) + 1;
  const shiftUrl = (direction: -1 | 1) =>
    pageUrl({
      ...state,
      from: isoDay(fromMs + direction * rangeDays * DAY_MS),
      to: isoDay(Math.min(toMs + direction * rangeDays * DAY_MS, today)),
    });
  const atToday = toMs >= today;
  const atRetention = fromMs <= today - RETENTION_DAYS * DAY_MS;

  return (
    <Flex direction="column" gap="4">
      <Heading size="4">Analytics</Heading>

      <Card size="2">
        <Flex direction="column" gap="3">
          <Flex gap="4" wrap="wrap">
            <Box>
              <Text as="div" size="1" color="gray" mb="1">
                Date range (UTC) — {range.from} → {range.to}
              </Text>
              <Flex gap="1" wrap="wrap" align="center">
                <Button size="1" variant="soft" disabled={atRetention} asChild={!atRetention}>
                  {atRetention ? <>‹</> : <Link href={shiftUrl(-1)}>‹</Link>}
                </Button>
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
                <Button size="1" variant="soft" disabled={atToday} asChild={!atToday}>
                  {atToday ? <>›</> : <Link href={shiftUrl(1)}>›</Link>}
                </Button>
              </Flex>
            </Box>
            <Box>
              <Text as="div" size="1" color="gray" mb="1">
                Group by
              </Text>
              <Flex gap="1" wrap="wrap">
                {(
                  Object.keys(ADMIN_DIMENSIONS) as AdminDimension[]
                ).map((dim) => {
                  const active = state.groupBy.includes(dim);
                  const groupBy = active
                    ? state.groupBy.filter((d) => d !== dim)
                    : [...state.groupBy, dim];
                  return (
                    <Button
                      key={dim}
                      asChild
                      size="1"
                      variant={active ? "solid" : "soft"}
                    >
                      <Link href={pageUrl({ ...state, groupBy })}>
                        {ADMIN_DIMENSIONS[dim].label}
                      </Link>
                    </Button>
                  );
                })}
              </Flex>
            </Box>
          </Flex>

          <form method="GET" action={adminAnalyticsUrl()}>
            <input
              type="hidden"
              name="groupBy"
              value={state.groupBy.join(",")}
            />
            <Flex gap="2" wrap="wrap" align="center">
              <TextField.Root
                size="1"
                type="date"
                name="from"
                defaultValue={range.from}
                aria-label="From (UTC)"
              />
              <Text size="1" color="gray">
                →
              </Text>
              <TextField.Root
                size="1"
                type="date"
                name="to"
                defaultValue={range.to}
                aria-label="To (UTC)"
              />
              <TextField.Root
                size="1"
                name="account"
                defaultValue={state.account ?? ""}
                placeholder="Filter by account id"
              />
              <TextField.Root
                size="1"
                name="product"
                defaultValue={state.product ?? ""}
                placeholder="Filter by product id"
              />
              <Button size="1" variant="soft" type="submit">
                Apply
              </Button>
            </Flex>
          </form>
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
            <AdminBreakdownChart
              buckets={breakdown.buckets}
              bucketHours={breakdown.bucketHours}
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
