"use client";

import { Flex, Button } from "@radix-ui/themes";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Period } from "@/lib/clients/analytics";

const PERIODS: { value: Period; label: string }[] = [
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
];

interface PeriodSelectorProps {
  currentPeriod: Period;
}

export function PeriodSelector({ currentPeriod }: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handlePeriodChange(period: Period) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", String(period));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Flex gap="1">
      {PERIODS.map(({ value, label }) => (
        <Button
          key={value}
          size="1"
          variant={currentPeriod === value ? "solid" : "soft"}
          color="gray"
          onClick={() => handlePeriodChange(value)}
        >
          {label}
        </Button>
      ))}
    </Flex>
  );
}
