"use client";

import { useRef } from "react";
import { Button, Flex, Text, TextField } from "@radix-ui/themes";

const DEBOUNCE_MS = 1000;

interface AdminFiltersFormProps {
  action: string;
  defaults: { from: string; to: string; account: string; product: string };
  /** Params to carry through unchanged (groupBy, interval, metric) */
  hidden: Record<string, string>;
}

/**
 * The admin explorer's filter form. Edits auto-apply after a quiet second —
 * the debounce lets several edits (both dates, a couple of filters) land in
 * one reload — while Enter or Apply still submits immediately.
 */
export function AdminFiltersForm({
  action,
  defaults,
  hidden,
}: AdminFiltersFormProps) {
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const submitSoon = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => form.current?.requestSubmit(), DEBOUNCE_MS);
  };

  return (
    <form
      ref={form}
      method="GET"
      action={action}
      onChange={submitSoon}
      onSubmit={() => clearTimeout(timer.current)}
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Flex gap="2" wrap="wrap" align="center">
        <TextField.Root
          size="1"
          type="date"
          name="from"
          defaultValue={defaults.from}
          aria-label="From (UTC)"
        />
        <Text size="1" color="gray">
          →
        </Text>
        <TextField.Root
          size="1"
          type="date"
          name="to"
          defaultValue={defaults.to}
          aria-label="To (UTC)"
        />
        <TextField.Root
          size="1"
          name="account"
          defaultValue={defaults.account}
          placeholder="Filter by account id"
        />
        <TextField.Root
          size="1"
          name="product"
          defaultValue={defaults.product}
          placeholder="Filter by product id"
        />
        <Button size="1" variant="soft" type="submit">
          Apply
        </Button>
      </Flex>
    </form>
  );
}
