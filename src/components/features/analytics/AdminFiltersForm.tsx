"use client";

import { useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Select,
  Text,
  TextField,
} from "@radix-ui/themes";
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import { MonoLabel } from "./panels";

const DEBOUNCE_MS = 500;

/** Value-input hints per dimension key (labels come from the page). */
const PLACEHOLDER: Record<string, string> = {
  account: "account id",
  product: "product id",
  country: "country code (US)",
  client: "ip hash prefix",
};

interface AdminFiltersFormProps {
  action: string;
  /** Filterable dimensions, same set as the group-by chips */
  dimensions: { key: string; label: string }[];
  defaults: { from: string; to: string; filters: Record<string, string> };
  /** Params to carry through unchanged (groupBy, interval, metric) */
  hidden: Record<string, string>;
}

/**
 * The admin explorer's filter form. Edits auto-apply after a brief quiet
 * period — the debounce lets several edits (both dates, a couple of filters)
 * land in one reload — while Enter or Apply still submits immediately. The
 * Apply button spins from the first detected edit until the reload lands.
 *
 * Filters are dynamic rows: a dimension dropdown naming the GET param plus
 * a value input, one row per dimension at most.
 */
export function AdminFiltersForm({
  action,
  dimensions,
  defaults,
  hidden,
}: AdminFiltersFormProps) {
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [rows, setRows] = useState<{ dim: string; value: string }[]>(
    Object.entries(defaults.filters).map(([dim, value]) => ({ dim, value })),
  );

  const submitSoon = () => {
    setPending(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => form.current?.requestSubmit(), DEBOUNCE_MS);
  };

  const setRow = (index: number, row: { dim: string; value: string }) => {
    setRows(rows.map((r, i) => (i === index ? row : r)));
    // Re-dimensioning an empty row changes nothing until a value is typed.
    if (row.value) submitSoon();
  };
  const removeRow = (index: number) => {
    const removed = rows[index];
    setRows(rows.filter((_, i) => i !== index));
    if (removed.value) submitSoon();
  };
  const addRow = () => {
    const free = dimensions.find((d) => !rows.some((r) => r.dim === d.key));
    if (free) setRows([...rows, { dim: free.key, value: "" }]);
  };

  return (
    // No form-level onChange: Radix Select keeps a hidden native <select>
    // whose change event would bubble here and submit a half-built filter
    // row. The real text inputs each debounce explicitly instead.
    <form
      ref={form}
      method="GET"
      action={action}
      onSubmit={() => {
        clearTimeout(timer.current);
        setPending(true);
      }}
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {/* align start: stretched children would pull the datetime inputs
          to the zone's full width. */}
      <Flex direction="column" gap="3" align="start">
        <Flex direction="column" gap="2">
          <TextField.Root
            size="1"
            type="datetime-local"
            name="from"
            defaultValue={defaults.from}
            aria-label="From (UTC)"
            onChange={submitSoon}
          />
          <TextField.Root
            size="1"
            type="datetime-local"
            name="to"
            defaultValue={defaults.to}
            aria-label="To (UTC, exclusive)"
            onChange={submitSoon}
          />
          <Text color="gray" style={{ fontSize: 11 }}>
            UTC · end exclusive
          </Text>
        </Flex>
        <Box>
          <Box mb="1">
            <MonoLabel>Filter by</MonoLabel>
          </Box>
          <Flex direction="column" gap="2" align="start">
            {rows.map((row, index) => (
              <Flex key={index} gap="2" align="center">
                <Select.Root
                  size="1"
                  value={row.dim}
                  onValueChange={(dim) => setRow(index, { ...row, dim })}
                >
                  <Select.Trigger aria-label="Filter dimension" />
                  <Select.Content>
                    {dimensions.map((d) => (
                      <Select.Item
                        key={d.key}
                        value={d.key}
                        // One filter per dimension: a value is an exact
                        // match, so a second row could only contradict it.
                        disabled={rows.some(
                          (r, i) => i !== index && r.dim === d.key,
                        )}
                      >
                        {d.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                <TextField.Root
                  size="1"
                  name={row.dim}
                  value={row.value}
                  onChange={(event) => {
                    setRows(
                      rows.map((r, i) =>
                        i === index ? { ...r, value: event.target.value } : r,
                      ),
                    );
                    submitSoon();
                  }}
                  placeholder={PLACEHOLDER[row.dim] ?? "value"}
                />
                <IconButton
                  size="1"
                  variant="soft"
                  type="button"
                  aria-label="Remove filter"
                  onClick={() => removeRow(index)}
                >
                  <Cross2Icon />
                </IconButton>
              </Flex>
            ))}
            <Flex gap="2">
              <Button
                size="1"
                variant="soft"
                type="button"
                onClick={addRow}
                disabled={rows.length >= dimensions.length}
              >
                <PlusIcon /> Add filter
              </Button>
              <Button size="1" variant="soft" type="submit" loading={pending}>
                Apply
              </Button>
            </Flex>
          </Flex>
        </Box>
      </Flex>
    </form>
  );
}
