"use client";

import { useState } from "react";
import { Box, Flex, Grid, Table, Tabs, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
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
  HoverCaption,
  MonoLabel,
  mono,
  Stat,
  StatRow,
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
  const t = useTranslations("ProductAnalyticsView");
  const tStat = useTranslations("AnalyticsPanels");
  const tHelp = useTranslations("AnalyticsHelp");
  const format = useFormatter();
  // The data layer names countries in English; render them in the reader's
  // language instead. Non-ISO codes (e.g. "T1") keep the data layer's name.
  const locale = useLocale();
  const regionNames = new Intl.DisplayNames([locale], { type: "region" });
  const countryName = (code: string, fallback: string) => {
    if (code === "??") return t("unknownCountry");
    try {
      return regionNames.of(code) || fallback;
    } catch {
      return fallback;
    }
  };
  const shown = hovered === null ? totals : days[hovered];
  const maxCountry = Math.max(
    1,
    ...(breakdowns?.countries.map((c) => c.requests) ?? []),
    breakdowns?.otherCountries?.requests ?? 0,
  );

  return (
    <Tabs.Root defaultValue="downloads">
      <Tabs.List size="1">
        <Tabs.Trigger value="downloads">
          <Text size="1" style={mono({ letterSpacing: "0.03em" })}>
            {t("downloadsTab")}
          </Text>
        </Tabs.Trigger>
        <Tabs.Trigger value="users">
          <Text size="1" style={mono({ letterSpacing: "0.03em" })}>
            {t("usersTab")}
          </Text>
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="downloads">
        <StatRow mt="3" pb="3" style={{ borderBottom: "1px solid var(--gray-4)" }}>
          <Stat
            label={tStat("downloads")}
            help={tHelp("downloads")}
            value={format.number(Math.round(shown.requests))}
          />
          <Stat
            label={t("dailyAvg")}
            help={tHelp("dailyAvg")}
            value={format.number(Math.round(totals.requests / days.length))}
          />
          <Stat
            label={tStat("dataServed")}
            help={tHelp("served")}
            value={formatBytes(shown.bytes, 1)}
          />
          <Stat
            label={tStat("countries")}
            help={tHelp("countries")}
            value={format.number(shown.countries)}
          />
        </StatRow>

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
            <MonoLabel>{t("byCountry")}</MonoLabel>
            {!breakdowns ? (
              <Text as="div" size="1" color="gray" mt="2">
                {t("breakdownUnavailable")}
              </Text>
            ) : (
              <Box mt="2">
                {[
                  ...breakdowns.countries.map((c) => ({
                    code: c.code,
                    label: countryName(c.code, c.name),
                    requests: c.requests,
                  })),
                  ...(breakdowns.otherCountries
                    ? [
                        {
                          code: "·",
                          label: t("otherCountries", {
                            count: breakdowns.otherCountries.count,
                          }),
                          requests: breakdowns.otherCountries.requests,
                        },
                      ]
                    : []),
                ].map((row) => (
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
                          {format.number(Math.round(row.requests))}
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
          <MonoLabel>{t("topFiles")}</MonoLabel>
          {!breakdowns || breakdowns.files.length === 0 ? (
            <Text as="div" size="1" color="gray" mt="2">
              {t("noFileDownloads")}
            </Text>
          ) : (
            <Table.Root size="1" mt="2">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>
                    <MonoLabel>{t("file")}</MonoLabel>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell justify="end">
                    <MonoLabel help={tHelp("downloads")}>
                      {tStat("downloads")}
                    </MonoLabel>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell justify="end">
                    <MonoLabel help={tHelp("served")}>
                      {tStat("dataServed")}
                    </MonoLabel>
                  </Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {breakdowns.files.map((file) => (
                  <Table.Row key={file.path}>
                    <Table.RowHeaderCell>
                      <Text size="1" style={mono()}>
                        <Link href={objectUrl(accountId, productId, file.path)}>
                          {file.path}
                        </Link>
                      </Text>
                    </Table.RowHeaderCell>
                    <Table.Cell justify="end">
                      <Text size="1" style={mono()}>
                        {format.number(Math.round(file.requests))}
                      </Text>
                    </Table.Cell>
                    <Table.Cell justify="end">
                      <Text size="1" style={mono()}>
                        {formatBytes(file.bytes, 1)}
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
