import { Metadata } from "next";
import Link from "next/link";
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
  ADMIN_WINDOWS,
  OTHER_KEY,
  getAdminBreakdown,
  isAnalyticsConfigured,
  type AdminBreakdown,
  type AdminDimension,
  type AdminWindow,
} from "@/lib/clients/analytics";
import {
  AdminBreakdownChart,
  seriesColor,
} from "@/components/features/analytics";
import { adminAnalyticsUrl, formatBytes } from "@/lib";
import { accountUrl } from "@/lib/urls";

export const metadata: Metadata = { title: "Admin — Analytics" };

const DEFAULT_WINDOW: AdminWindow = "1wk";

interface PageState {
  window: AdminWindow;
  groupBy: AdminDimension[];
  account?: string;
  product?: string;
}

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

function parseState(params: Record<string, string | string[] | undefined>): PageState {
  const windowParam = first(params.window);
  const groupByParam = first(params.groupBy);
  return {
    window:
      windowParam && windowParam in ADMIN_WINDOWS
        ? (windowParam as AdminWindow)
        : DEFAULT_WINDOW,
    // Absent → the default grouping; present but empty → no grouping at all.
    groupBy:
      groupByParam === undefined
        ? ["product"]
        : [
            ...new Set(
              groupByParam
                .split(",")
                .filter((d): d is AdminDimension => d in ADMIN_DIMENSIONS),
            ),
          ],
    account: first(params.account)?.trim() || undefined,
    product: first(params.product)?.trim() || undefined,
  };
}

function pageUrl(state: PageState): string {
  const params = new URLSearchParams({
    window: state.window,
    groupBy: state.groupBy.join(","),
  });
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

  return (
    <Flex direction="column" gap="4">
      <Heading size="4">Analytics</Heading>

      <Card size="2">
        <Flex direction="column" gap="3">
          <Flex gap="4" wrap="wrap">
            <Box>
              <Text as="div" size="1" color="gray" mb="1">
                Time range
              </Text>
              <Flex gap="1" wrap="wrap">
                {(
                  Object.keys(ADMIN_WINDOWS) as AdminWindow[]
                ).map((window) => (
                  <Button
                    key={window}
                    asChild
                    size="1"
                    variant={window === state.window ? "solid" : "soft"}
                  >
                    <Link href={pageUrl({ ...state, window })}>
                      {ADMIN_WINDOWS[window].label}
                    </Link>
                  </Button>
                ))}
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
            <input type="hidden" name="window" value={state.window} />
            <input
              type="hidden"
              name="groupBy"
              value={state.groupBy.join(",")}
            />
            <Flex gap="2" wrap="wrap">
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
            No traffic recorded for this selection in the past{" "}
            {ADMIN_WINDOWS[state.window].label.toLowerCase()}.
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
                <Table.ColumnHeaderCell align="right">
                  Data served
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell align="right">
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
                    <Table.Cell align="right">
                      {formatBytes(group.bytes)}
                    </Table.Cell>
                    <Table.Cell align="right">
                      {Math.round(group.requests).toLocaleString()}
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
