"use client";

import { useRef, useState } from "react";
import { Box, Button, Flex, Text, TextField } from "@radix-ui/themes";
import { MonoLabel } from "./panels";

const DEBOUNCE_MS = 500;

interface AdminFiltersFormProps {
  action: string;
  defaults: { from: string; to: string; account: string; product: string };
  /** Params to carry through unchanged (groupBy, interval, metric) */
  hidden: Record<string, string>;
}

/**
 * The admin explorer's filter form. Edits auto-apply after a brief quiet
 * period — the debounce lets several edits (both dates, a couple of filters)
 * land in one reload — while Enter or Apply still submits immediately. The
 * Apply button spins from the first detected edit until the reload lands.
 */
export function AdminFiltersForm({
  action,
  defaults,
  hidden,
}: AdminFiltersFormProps) {
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pending, setPending] = useState(false);

  const submitSoon = () => {
    setPending(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => form.current?.requestSubmit(), DEBOUNCE_MS);
  };

  return (
    <form
      ref={form}
      method="GET"
      action={action}
      onChange={submitSoon}
      onSubmit={() => {
        clearTimeout(timer.current);
        setPending(true);
      }}
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Flex direction="column" gap="3">
        <Flex gap="2" align="center" wrap="wrap">
          <TextField.Root
            size="1"
            type="datetime-local"
            name="from"
            defaultValue={defaults.from}
            aria-label="From (UTC)"
          />
          <Text size="1" color="gray">
            →
          </Text>
          <TextField.Root
            size="1"
            type="datetime-local"
            name="to"
            defaultValue={defaults.to}
            aria-label="To (UTC, exclusive)"
          />
          <Text size="1" color="gray">
            end exclusive
          </Text>
        </Flex>
        <Box>
          <Box mb="1">
            <MonoLabel>Filter by</MonoLabel>
          </Box>
          <Flex gap="2" wrap="wrap" align="center">
            <TextField.Root
              size="1"
              name="account"
              defaultValue={defaults.account}
              placeholder="account id"
            />
            <TextField.Root
              size="1"
              name="product"
              defaultValue={defaults.product}
              placeholder="product id"
            />
            <Button size="1" variant="soft" type="submit" loading={pending}>
              Apply
            </Button>
          </Flex>
        </Box>
      </Flex>
    </form>
  );
}
