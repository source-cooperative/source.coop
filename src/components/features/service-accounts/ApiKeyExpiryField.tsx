"use client";

import React, { useState } from "react";
import { Select } from "@radix-ui/themes";
import { useTranslations } from "next-intl";
import { Field } from "@/components/core";

// Select forbids an empty item value, so "never" stands for the empty
// `expires_in_days` the key actions read as no expiry.
const NEVER = "never";

const EXPIRIES = [
  { value: "30", labelKey: "days30" },
  { value: "90", labelKey: "days90" },
  { value: "365", labelKey: "year" },
  { value: NEVER, labelKey: "never" },
] as const;

/**
 * How long an API key lasts, counted from now: the `expires_in_days` field
 * that both issuing a key and changing its expiry submit.
 */
export function ApiKeyExpiryField({ id, never = false }: { id: string; never?: boolean }) {
  const [expiry, setExpiry] = useState<string>(never ? NEVER : "90");
  const t = useTranslations("ApiKeyExpiryField");
  return (
    <Field label={t("expires")} htmlFor={id}>
      <input type="hidden" name="expires_in_days" value={expiry === NEVER ? "" : expiry} />
      <Select.Root value={expiry} onValueChange={setExpiry}>
        <Select.Trigger id={id} />
        <Select.Content>
          {EXPIRIES.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              {t(option.labelKey)}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </Field>
  );
}
