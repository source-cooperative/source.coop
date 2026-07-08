"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Flex } from "@radix-ui/themes";

const DEBOUNCE_MS = 1000;

interface GroupByChipsProps {
  dimensions: { key: string; label: string }[];
  selected: string[];
}

/**
 * Multi-select group-by toggles. Chips flip instantly (local state) and the
 * navigation is debounced, so composing several dimensions costs one reload
 * instead of one per click. Other params are read from the URL at fire time
 * so nothing else (range, interval, metric, filters) is lost.
 */
export function GroupByChips({ dimensions, selected }: GroupByChipsProps) {
  const router = useRouter();
  const [active, setActive] = useState(selected);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toggle = (key: string) => {
    const next = active.includes(key)
      ? active.filter((k) => k !== key)
      : [...active, key];
    setActive(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const url = new URL(window.location.href);
      // Present-but-empty means "no grouping", distinct from the default.
      url.searchParams.set("groupBy", next.join(","));
      router.push(url.pathname + url.search);
    }, DEBOUNCE_MS);
  };

  return (
    <Flex gap="1" wrap="wrap">
      {dimensions.map((dim) => (
        <Button
          key={dim.key}
          size="1"
          variant={active.includes(dim.key) ? "solid" : "soft"}
          onClick={() => toggle(dim.key)}
        >
          {dim.label}
        </Button>
      ))}
    </Flex>
  );
}
