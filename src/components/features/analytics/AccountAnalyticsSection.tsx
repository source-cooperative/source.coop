"use client";

import { Box, Card, Flex } from "@radix-ui/themes";
import { StackedAreaChart } from "./StackedAreaChart";
import { PeriodSelector } from "./PeriodSelector";
import { SectionHeader } from "@/components/core/SectionHeader";
import type { DailyAccountProductStats, Period } from "@/lib/clients/analytics";

interface AccountAnalyticsSectionProps {
  data: DailyAccountProductStats[];
  period: Period;
}

export function AccountAnalyticsSection({
  data,
  period,
}: AccountAnalyticsSectionProps) {
  if (data.length === 0) return null;

  return (
    <Box mb="6">
      <Card>
        <SectionHeader
          title="Analytics"
          rightButton={<PeriodSelector currentPeriod={period} />}
        >
          <Flex direction="column" gap="6">
            <StackedAreaChart data={data} dataKey="downloads" label="Downloads" />
            <StackedAreaChart data={data} dataKey="bytes" label="Bytes Downloaded" />
          </Flex>
        </SectionHeader>
      </Card>
    </Box>
  );
}
