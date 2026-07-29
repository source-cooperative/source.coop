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
  // One hover at a time; each panel narrows the other two to its slice.
  const [hover, setHover] = useState<
    | { type: "day"; index: number }
    | { type: "country"; code: string }
    | { type: "file"; path: string }
    | null
  >(null);
  const dayIndex = hover?.type === "day" ? hover.index : null;
  const shown = dayIndex === null ? totals : days[dayIndex];
  const day = dayIndex === null ? null : days[dayIndex].date;
  const hoveredCountry = hover?.type === "country" ? hover.code : null;
  const hoveredFile =
    hover?.type === "file"
      ? breakdowns?.files.find((f) => f.path === hover.path)
      : undefined;

  // The "·" code is the others aggregate's row.
  const countryByDay = (code: string) =>
    (code === "·"
      ? breakdowns?.otherCountries?.byDay
      : breakdowns?.countries.find((c) => c.code === code)?.byDay) ?? {};
  let chartDays = days;
  if (hoveredCountry !== null) {
    const byDay = countryByDay(hoveredCountry);
    chartDays = days.map((d) => ({ ...d, requests: byDay[d.date] ?? 0 }));
  } else if (hoveredFile) {
    chartDays = days.map((d) => ({
      ...d,
      requests: hoveredFile.byDay[d.date]?.requests ?? 0,
      bytes: hoveredFile.byDay[d.date]?.bytes ?? 0,
    }));
  }

  const countryRows = breakdowns
    ? [
        ...breakdowns.countries.map((c) => ({
          code: c.code,
          label: c.name,
          requests:
            day !== null
              ? (c.byDay[day] ?? 0)
              : hoveredFile
                ? (hoveredFile.byCountry[c.code]?.requests ?? 0)
                : c.requests,
        })),
        ...(breakdowns.otherCountries
          ? [
              {
                code: "·",
                label: `${breakdowns.otherCountries.count} others`,
                requests:
                  day !== null
                    ? (breakdowns.otherCountries.byDay[day] ?? 0)
                    : hoveredFile
                      ? hoveredFile.otherCountries.requests
                      : breakdowns.otherCountries.requests,
              },
            ]
          : []),
      ]
    : [];
  // Re-rank by the hovered slice's values, others pinned last. A hovered
  // country never re-sorts its own list (its values stay window-wide), so
  // rows can't shuffle under the cursor.
  if (day !== null || hoveredFile) {
    countryRows.sort(
      (a, b) =>
        Number(a.code === "·") - Number(b.code === "·") ||
        b.requests - a.requests,
    );
  }
  const maxCountry = Math.max(1, ...countryRows.map((row) => row.requests));

  const fileRows = (breakdowns?.files ?? []).map((file) => ({
    path: file.path,
    shown:
      day !== null
        ? (file.byDay[day] ?? { requests: 0, bytes: 0 })
        : hoveredCountry !== null
          ? hoveredCountry === "·"
            ? file.otherCountries
            : (file.byCountry[hoveredCountry] ?? { requests: 0, bytes: 0 })
          : file,
  }));
  if (day !== null || hoveredCountry !== null) {
    fileRows.sort((a, b) => b.shown.requests - a.shown.requests);
  }

  const filterLabel =
    hoveredCountry !== null
      ? countryRows.find((row) => row.code === hoveredCountry)?.label
      : hover?.type === "file"
        ? hover.path
        : null;

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
            <HoverCaption days={days} hovered={dayIndex} filterLabel={filterLabel} />
            <DownloadsChart
              days={chartDays}
              hovered={dayIndex}
              onHover={(index) =>
                setHover(index === null ? null : { type: "day", index })
              }
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
                  <Flex
                    key={`${row.code}-${row.label}`}
                    gap="2"
                    mb="2"
                    align="start"
                    onMouseEnter={() =>
                      setHover({ type: "country", code: row.code })
                    }
                    onMouseLeave={() => setHover(null)}
                    style={
                      hoveredCountry === row.code
                        ? { background: "var(--green-a2)" }
                        : undefined
                    }
                  >
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
                {fileRows.map((file) => (
                  <Table.Row
                    key={file.path}
                    onMouseEnter={() =>
                      setHover({ type: "file", path: file.path })
                    }
                    onMouseLeave={() => setHover(null)}
                    style={
                      hoveredFile?.path === file.path
                        ? { background: "var(--green-a2)" }
                        : undefined
                    }
                  >
                    <Table.RowHeaderCell>
                      <Text size="1" style={mono()}>
                        <Link href={objectUrl(accountId, productId, file.path)}>
                          {file.path}
                        </Link>
                      </Text>
                    </Table.RowHeaderCell>
                    <Table.Cell justify="end">
                      <Text size="1" style={mono()}>
                        {numberFormat.format(Math.round(file.shown.requests))}
                      </Text>
                    </Table.Cell>
                    <Table.Cell justify="end">
                      <Text size="1" style={mono()}>
                        {formatBytes(file.shown.bytes, 1)}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
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
