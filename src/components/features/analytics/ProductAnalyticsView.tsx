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
  // One pin per dimension (country, file, day), each toggled by clicking a
  // row or chart bar; the pins compose into an intersection filter. A hover
  // substitutes for its own dimension's pin while the cursor is there, so
  // sweeping rows previews siblings without dropping the other pins. Lists
  // never take values from their own dimension, so hovering/pinning a row
  // re-values only the *other* panels and rows can't shuffle under the
  // cursor.
  const [hover, setHover] = useState<
    | { type: "day"; index: number }
    | { type: "country"; code: string }
    | { type: "file"; path: string }
    | null
  >(null);
  const [pins, setPins] = useState<{
    country: string | null;
    file: string | null;
    day: number | null;
  }>({ country: null, file: null, day: null });
  const effCountry = hover?.type === "country" ? hover.code : pins.country;
  const effFile = hover?.type === "file" ? hover.path : pins.file;
  const effDay = hover?.type === "day" ? hover.index : pins.day;
  const day = effDay === null ? null : days[effDay].date;

  const zeroEntry = {
    requests: 0,
    bytes: 0,
    byDay: {} as Record<string, { requests: number; bytes: number }>,
  };
  // The "·" code is the others aggregate's row.
  const countryEntity =
    effCountry !== null
      ? effCountry === "·"
        ? breakdowns?.otherCountries
        : breakdowns?.countries.find((c) => c.code === effCountry)
      : undefined;
  const fileEntity =
    effFile !== null
      ? breakdowns?.files.find((f) => f.path === effFile)
      : undefined;
  // The active country∩file entity: window totals plus a per-day series
  // (from the day×country×file cube when both dimensions are set).
  const entity =
    countryEntity && fileEntity
      ? ((effCountry === "·"
          ? fileEntity.otherCountries
          : fileEntity.byCountry[effCountry!]) ?? zeroEntry)
      : (countryEntity ?? fileEntity ?? null);

  // Countries stat: 1 for one country; the others row's distinct count is
  // window-wide only, so it's unknowable (NaN → "—") when further narrowed.
  const shownCountries = countryEntity
    ? effCountry === "·"
      ? fileEntity || day !== null
        ? NaN
        : (breakdowns?.otherCountries?.count ?? 0)
      : 1
    : fileEntity
      ? day !== null
        ? (fileEntity.byDay[day]?.countries ?? 0)
        : fileEntity.countries
      : day !== null
        ? days[effDay!].countries
        : totals.countries;
  const shown = {
    ...(entity
      ? day !== null
        ? (entity.byDay[day] ?? zeroEntry)
        : entity
      : day !== null
        ? days[effDay!]
        : totals),
    countries: shownCountries,
  };
  const avgRequests = (entity?.requests ?? totals.requests) / days.length;

  let chartDays = days;
  if (entity) {
    chartDays = days.map((d) => ({
      ...d,
      requests: entity.byDay[d.date]?.requests ?? 0,
      bytes: entity.byDay[d.date]?.bytes ?? 0,
    }));
  }

  // Country list: driven by the effective file and day, never by a country.
  const countryRows = breakdowns
    ? [
        ...breakdowns.countries.map((c) => {
          const e = fileEntity
            ? (fileEntity.byCountry[c.code] ?? zeroEntry)
            : c;
          return {
            code: c.code,
            label: c.name,
            requests: day !== null ? (e.byDay[day]?.requests ?? 0) : e.requests,
          };
        }),
        ...(breakdowns.otherCountries
          ? [
              {
                code: "·",
                label: `${breakdowns.otherCountries.count} others`,
                requests: (() => {
                  const e = fileEntity
                    ? fileEntity.otherCountries
                    : breakdowns.otherCountries;
                  return day !== null
                    ? (e.byDay[day]?.requests ?? 0)
                    : e.requests;
                })(),
              },
            ]
          : []),
      ]
    : [];
  // Re-rank by the active filter's values, others pinned last.
  if (fileEntity || day !== null) {
    countryRows.sort(
      (a, b) =>
        Number(a.code === "·") - Number(b.code === "·") ||
        b.requests - a.requests,
    );
  }
  const maxCountry = Math.max(1, ...countryRows.map((row) => row.requests));

  // Files table: driven by the effective country and day, never by a file.
  const fileRows = (breakdowns?.files ?? []).map((file) => {
    const e =
      effCountry !== null
        ? effCountry === "·"
          ? file.otherCountries
          : (file.byCountry[effCountry] ?? zeroEntry)
        : file;
    return {
      path: file.path,
      shown: day !== null ? (e.byDay[day] ?? zeroEntry) : e,
    };
  });
  if (effCountry !== null || day !== null) {
    fileRows.sort((a, b) => b.shown.requests - a.shown.requests);
  }

  const countryRowLabel = (code: string) =>
    countryRows.find((row) => row.code === code)?.label;
  const filterLabel =
    [effCountry !== null ? countryRowLabel(effCountry) : null, effFile]
      .filter(Boolean)
      .join(" · ") || null;
  const togglePin = <K extends "country" | "file" | "day">(
    dim: K,
    value: NonNullable<(typeof pins)[K]>,
  ) => setPins((p) => ({ ...p, [dim]: p[dim] === value ? null : value }));
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
            <HoverCaption days={days} hovered={effDay} filterLabel={filterLabel} />
            <DownloadsChart
              days={chartDays}
              hovered={effDay}
              onHover={(index) =>
                setHover(index === null ? null : { type: "day", index })
              }
              onSelect={(index) => index !== null && togglePin("day", index)}
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
                    onClick={() => togglePin("country", row.code)}
                    style={rowHighlight(
                      pins.country === row.code,
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
                    onClick={() => togglePin("file", file.path)}
                    style={rowHighlight(
                      pins.file === file.path,
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
                        {effCountry !== null || day !== null
                          ? "—"
                          : numberFormat.format(
                              Math.round(breakdowns.otherFiles.requests),
                            )}
                      </Text>
                    </Table.Cell>
                    <Table.Cell justify="end">
                      <Text size="1" color="gray" style={mono()}>
                        {effCountry !== null || day !== null
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
