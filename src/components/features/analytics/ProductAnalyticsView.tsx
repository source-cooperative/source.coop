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
  // Clicking a country/file row pins that slice so the chart and stats stay
  // scoped to it — hovering a day then interrogates values within the pin.
  type Slice =
    | { type: "country"; code: string }
    | { type: "file"; path: string };
  const [hover, setHover] = useState<({ type: "day"; index: number } | Slice) | null>(
    null,
  );
  const [pin, setPin] = useState<Slice | null>(null);
  const dayIndex = hover?.type === "day" ? hover.index : null;
  const day = dayIndex === null ? null : days[dayIndex].date;
  const hoverEntity = hover && hover.type !== "day" ? hover : null;
  // Hovering the opposite type of an active pin is additive: the pin keeps
  // scoping the lists and chart, and the stats narrow to pin ∩ hover (from
  // the country×file cross data). A same-type hover previews that row instead.
  const cross =
    pin && hoverEntity && pin.type !== hoverEntity.type
      ? {
          path:
            pin.type === "file"
              ? pin.path
              : hoverEntity.type === "file"
                ? hoverEntity.path
                : "",
          code:
            pin.type === "country"
              ? pin.code
              : hoverEntity.type === "country"
                ? hoverEntity.code
                : "",
        }
      : null;
  const slice = cross ? pin : (hoverEntity ?? pin);
  const sliceCountry =
    slice?.type === "country"
      ? slice.code === "·"
        ? breakdowns?.otherCountries
        : breakdowns?.countries.find((c) => c.code === slice.code)
      : undefined;
  const sliceFile =
    slice?.type === "file"
      ? breakdowns?.files.find((f) => f.path === slice.path)
      : undefined;
  const sliceEntity = sliceCountry ?? sliceFile;

  // Stats row: the active slice's window totals, or its single-day values
  // while a chart day is hovered. `countries` is 1 for one country, the
  // aggregate's count for the others row, and per-slice for files.
  const sliceCountries = sliceFile
    ? sliceFile.countries
    : slice?.type === "country" && slice.code === "·"
      ? (breakdowns?.otherCountries?.count ?? 0)
      : 1;
  // Intersection values for an additive pin + hover; countries is 1 for a
  // single country and unknowable (NaN → rendered "—") for the others row.
  const crossValues = cross
    ? {
        ...((cross.code === "·"
          ? breakdowns?.files.find((f) => f.path === cross.path)?.otherCountries
          : breakdowns?.files.find((f) => f.path === cross.path)?.byCountry[
              cross.code
            ]) ?? { requests: 0, bytes: 0 }),
        countries: cross.code === "·" ? NaN : 1,
      }
    : null;
  const shown =
    crossValues ??
    (sliceEntity
      ? day !== null
        ? {
            ...(sliceEntity.byDay[day] ?? { requests: 0, bytes: 0 }),
            countries:
              sliceFile ? (sliceFile.byDay[day]?.countries ?? 0) : sliceCountries,
          }
        : { requests: sliceEntity.requests, bytes: sliceEntity.bytes, countries: sliceCountries }
      : day !== null
        ? days[dayIndex!]
        : totals);
  const avgRequests =
    (crossValues?.requests ?? sliceEntity?.requests ?? totals.requests) /
    days.length;

  let chartDays = days;
  if (sliceEntity) {
    chartDays = days.map((d) => ({
      ...d,
      requests: sliceEntity.byDay[d.date]?.requests ?? 0,
      bytes: sliceEntity.byDay[d.date]?.bytes ?? 0,
    }));
  }

  // Lists: a file slice re-values the country list and vice versa; a hovered
  // day re-values both only when nothing is pinned (no day×country×file data).
  const dayValuesLists = day !== null && !pin;
  const countrySliceFile = sliceFile;
  const countryRows = breakdowns
    ? [
        ...breakdowns.countries.map((c) => ({
          code: c.code,
          label: c.name,
          requests: countrySliceFile
            ? (countrySliceFile.byCountry[c.code]?.requests ?? 0)
            : dayValuesLists
              ? (c.byDay[day!]?.requests ?? 0)
              : c.requests,
        })),
        ...(breakdowns.otherCountries
          ? [
              {
                code: "·",
                label: `${breakdowns.otherCountries.count} others`,
                requests: countrySliceFile
                  ? countrySliceFile.otherCountries.requests
                  : dayValuesLists
                    ? (breakdowns.otherCountries.byDay[day!]?.requests ?? 0)
                    : breakdowns.otherCountries.requests,
              },
            ]
          : []),
      ]
    : [];
  // Re-rank by the active slice's values, others pinned last. A hovered
  // country never re-sorts its own list (its values stay window-wide), so
  // rows can't shuffle under the cursor.
  if (countrySliceFile || dayValuesLists) {
    countryRows.sort(
      (a, b) =>
        Number(a.code === "·") - Number(b.code === "·") ||
        b.requests - a.requests,
    );
  }
  const maxCountry = Math.max(1, ...countryRows.map((row) => row.requests));

  const fileSliceCountry = slice?.type === "country" ? slice.code : null;
  const fileRows = (breakdowns?.files ?? []).map((file) => ({
    path: file.path,
    shown:
      fileSliceCountry !== null
        ? fileSliceCountry === "·"
          ? file.otherCountries
          : (file.byCountry[fileSliceCountry] ?? { requests: 0, bytes: 0 })
        : dayValuesLists
          ? (file.byDay[day!] ?? { requests: 0, bytes: 0 })
          : file,
  }));
  if (fileSliceCountry !== null || dayValuesLists) {
    fileRows.sort((a, b) => b.shown.requests - a.shown.requests);
  }

  const countryRowLabel = (code: string) =>
    countryRows.find((row) => row.code === code)?.label;
  const filterLabel = cross
    ? `${countryRowLabel(cross.code)} · ${cross.path}`
    : slice
      ? slice.type === "country"
        ? countryRowLabel(slice.code)
        : slice.path
      : null;
  const togglePin = (next: Slice) =>
    setPin(
      pin &&
        pin.type === next.type &&
        (pin.type === "country"
          ? pin.code === (next as { code: string }).code
          : pin.path === (next as { path: string }).path)
        ? null
        : next,
    );
  const rowHighlight = (isPin: boolean, isHover: boolean) =>
    isPin
      ? { background: "var(--green-a3)", cursor: "pointer" }
      : isHover
        ? { background: "var(--green-a2)", cursor: "pointer" }
        : { cursor: "pointer" };

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
            value={numberFormat.format(Math.round(avgRequests))}
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
            value={
              Number.isFinite(shown.countries)
                ? numberFormat.format(shown.countries)
                : "—"
            }
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
                    onClick={() =>
                      togglePin({ type: "country", code: row.code })
                    }
                    style={rowHighlight(
                      pin?.type === "country" && pin.code === row.code,
                      hover?.type === "country" && hover.code === row.code,
                    )}
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
                    onClick={() => togglePin({ type: "file", path: file.path })}
                    style={rowHighlight(
                      pin?.type === "file" && pin.path === file.path,
                      hover?.type === "file" && hover.path === file.path,
                    )}
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
                {breakdowns.otherFiles && (
                  <Table.Row>
                    <Table.RowHeaderCell>
                      <Text size="1" color="gray" style={mono()}>
                        {numberFormat.format(breakdowns.otherFiles.count)} other
                        files
                      </Text>
                    </Table.RowHeaderCell>
                    {/* The remainder is window-wide only — no per-day/country
                        slice data, so it blanks while a slice is active. */}
                    <Table.Cell justify="end">
                      <Text size="1" color="gray" style={mono()}>
                        {fileSliceCountry !== null || dayValuesLists
                          ? "—"
                          : numberFormat.format(
                              Math.round(breakdowns.otherFiles.requests),
                            )}
                      </Text>
                    </Table.Cell>
                    <Table.Cell justify="end">
                      <Text size="1" color="gray" style={mono()}>
                        {fileSliceCountry !== null || dayValuesLists
                          ? "—"
                          : formatBytes(breakdowns.otherFiles.bytes, 1)}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                )}
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
