"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Flex, Spinner } from "@radix-ui/themes";

const DEBOUNCE_MS = 500;

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
  const [waiting, setWaiting] = useState(false);
  const [navigating, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // A pending push must die with the page: it reads window.location when it
  // fires, so after navigating away it would yank the user back here.
  useEffect(() => () => clearTimeout(timer.current), []);

  const toggle = (key: string) => {
    const next = active.includes(key)
      ? active.filter((k) => k !== key)
      : [...active, key];
    setActive(next);
    setWaiting(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setWaiting(false);
      const url = new URL(window.location.href);
      // Present-but-empty means "no grouping", distinct from the default.
      url.searchParams.set("groupBy", next.join(","));
      startTransition(() => router.push(url.pathname + url.search));
    }, DEBOUNCE_MS);
  };

  return (
    <Flex gap="1" wrap="wrap" align="center">
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
      {(waiting || navigating) && <Spinner size="1" />}
    </Flex>
  );
}
