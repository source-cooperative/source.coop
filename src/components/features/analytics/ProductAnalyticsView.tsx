"use client";

import { useState } from "react";
import { Box, Flex, Grid, Table, Tabs, Text } from "@radix-ui/themes";
import Link from "next/link";
import type {
  ProductBreakdowns,
  UsagePoint,
  UsageTotals,
  UsageUsers,
} from "@/lib/clients/analytics";
import { formatBytes } from "@/lib/format";
import { objectUrl } from "@/lib/urls";
import {
  DownloadsChart,
  HELP,
  HoverCaption,
  MonoLabel,
  mono,
  numberFormat,
  Stat,
  UsersContent,
} from "./panels";

interface ProductAnalyticsViewProps {
  accountId: string;
  productId: string;
  days: UsagePoint[];
  totals: UsageTotals;
  users: UsageUsers;
  breakdowns: ProductBreakdowns | null;
}

/**
 * Full product analytics page body (issue #257 mock): stats row with daily
 * average, downloads chart beside a by-country ranking, and a top-files
 * table. Same DOWNLOADS/USERS tab pair as the compact card.
 */
export function ProductAnalyticsView({
  accountId,
  productId,
  days,
  totals,
  users,
  breakdowns,
}: ProductAnalyticsViewProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered === null ? totals : days[hovered];
  // Hovering a bar narrows the country/file panels to that UTC day.
  const day = hovered === null ? null : days[hovered].date;
  const countryRows = breakdowns
    ? [
        ...breakdowns.countries.map((c) => ({
          code: c.code,
          label: c.name,
          requests: day === null ? c.requests : (c.byDay[day] ?? 0),
        })),
        ...(breakdowns.otherCountries
          ? [
              {
                code: "·",
                label: `${breakdowns.otherCountries.count} others`,
                requests:
                  day === null
                    ? breakdowns.otherCountries.requests
                    : (breakdowns.otherCountries.byDay[day] ?? 0),
              },
            ]
          : []),
      ]
    : [];
  const maxCountry = Math.max(1, ...countryRows.map((row) => row.requests));

  return (
    <Tabs.Root defaultValue="downloads">
      <Tabs.List size="1">
        <Tabs.Trigger value="downloads">
          <Text size="1" style={mono({ letterSpacing: "0.03em" })}>
            DOWNLOADS
          </Text>
        </Tabs.Trigger>
        <Tabs.Trigger value="users">
          <Text size="1" style={mono({ letterSpacing: "0.03em" })}>
            USERS
          </Text>
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="downloads">
        <Flex mt="3" pb="3" style={{ borderBottom: "1px solid var(--gray-4)" }}>
          <Stat
            label="Downloads"
            help={HELP.downloads}
            value={numberFormat.format(Math.round(shown.requests))}
          />
          <Stat
            label="Daily avg"
            help={HELP.dailyAvg}
            value={numberFormat.format(Math.round(totals.requests / days.length))}
            divider
          />
          <Stat
            label="Data served"
            help={HELP.served}
            value={formatBytes(shown.bytes, 1)}
            divider
          />
          <Stat
            label="Countries"
            help={HELP.countries}
            value={numberFormat.format(shown.countries)}
            divider
          />
        </Flex>

        <Grid columns={{ initial: "1", md: "5" }} gap="6" mt="4">
          <Box style={{ gridColumn: "span 3" }}>
            <HoverCaption days={days} hovered={hovered} />
            <DownloadsChart
              days={days}
              hovered={hovered}
              onHover={setHovered}
              height={180}
            />
          </Box>

          <Box style={{ gridColumn: "span 2" }}>
            <MonoLabel>By country</MonoLabel>
            {!breakdowns ? (
              <Text as="div" size="1" color="gray" mt="2">
                Country breakdown unavailable.
              </Text>
            ) : (
              <Box mt="2">
                {countryRows.map((row) => (
                  <Flex key={`${row.code}-${row.label}`} gap="2" mb="2" align="start">
                    <Text
                      size="1"
                      color="gray"
                      style={mono({ width: 24, flexShrink: 0 })}
                    >
                      {row.code}
                    </Text>
                    <Box style={{ flexGrow: 1, minWidth: 0 }}>
                      <Flex justify="between" gap="2">
                        <Text
                          size="1"
                          truncate
                          style={mono({
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                          })}
                        >
                          {row.label}
                        </Text>
                        <Text size="1" color="gray" style={mono()}>
                          {numberFormat.format(Math.round(row.requests))}
                        </Text>
                      </Flex>
                      <Box
                        mt="1"
                        height="4px"
                        style={{ background: "var(--gray-4)" }}
                      >
                        <Box
                          height="4px"
                          style={{
                            width: `${(row.requests / maxCountry) * 100}%`,
                            background: "var(--gray-12)",
                          }}
                        />
                      </Box>
                    </Box>
                  </Flex>
                ))}
              </Box>
            )}
          </Box>
        </Grid>

        <Box mt="4">
          <MonoLabel>Top files</MonoLabel>
          {!breakdowns || breakdowns.files.length === 0 ? (
            <Text as="div" size="1" color="gray" mt="2">
              No file downloads in this period.
            </Text>
          ) : (
            <Table.Root size="1" mt="2">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>
                    <MonoLabel>File</MonoLabel>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell justify="end">
                    <MonoLabel help={HELP.downloads}>Downloads</MonoLabel>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell justify="end">
                    <MonoLabel help={HELP.served}>Data served</MonoLabel>
                  </Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {breakdowns.files.map((file) => {
                  const shownFile =
                    day === null
                      ? file
                      : (file.byDay[day] ?? { requests: 0, bytes: 0 });
                  return (
                    <Table.Row key={file.path}>
                      <Table.RowHeaderCell>
                        <Text size="1" style={mono()}>
                          <Link
                            href={objectUrl(accountId, productId, file.path)}
                          >
                            {file.path}
                          </Link>
                        </Text>
                      </Table.RowHeaderCell>
                      <Table.Cell justify="end">
                        <Text size="1" style={mono()}>
                          {numberFormat.format(Math.round(shownFile.requests))}
                        </Text>
                      </Table.Cell>
                      <Table.Cell justify="end">
                        <Text size="1" style={mono()}>
                          {formatBytes(shownFile.bytes, 1)}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Tabs.Content>

      <Tabs.Content value="users">
        <UsersContent users={users} />
      </Tabs.Content>
    </Tabs.Root>
  );
}
