"use client";

import React, { useState } from "react";
import { Select } from "@radix-ui/themes";
import { Field } from "@/components/core";

// Select forbids an empty item value, so "never" stands for the empty
// `expires_in_days` the key actions read as no expiry.
const NEVER = "never";

const EXPIRIES = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "A year" },
  { value: NEVER, label: "Never — until revoked" },
];

/**
 * How long an API key lasts, counted from now: the `expires_in_days` field
 * that both issuing a key and changing its expiry submit.
 */
export function ApiKeyExpiryField({ id, never = false }: { id: string; never?: boolean }) {
  const [expiry, setExpiry] = useState(never ? NEVER : "90");
  return (
    <Field label="Expires" htmlFor={id}>
      <input type="hidden" name="expires_in_days" value={expiry === NEVER ? "" : expiry} />
      <Select.Root value={expiry} onValueChange={setExpiry}>
        <Select.Trigger id={id} />
        <Select.Content>
          {EXPIRIES.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              {option.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </Field>
  );
}
