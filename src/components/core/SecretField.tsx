"use client";

import { useState } from "react";
import { Button, Flex, Text, TextField } from "@radix-ui/themes";
import { CheckIcon } from "@radix-ui/react-icons";
import { Field } from "./Field";

/**
 * A write-only credential: says whether one is stored, and reveals an input
 * only when the user asks to change it.
 *
 * Rendering an empty password box in both states is what made an authenticated
 * connection indistinguishable from one with no credential at all — the field
 * looked the same whether a key was saved or none had ever been set.
 *
 * Nothing secret reaches the browser to do this. The caller passes `stored` as
 * a boolean, derived server-side from the presence of a credential, never from
 * its value.
 */
export function SecretField({
  label,
  help,
  name,
  stored,
  required,
  errors,
  defaultValue,
}: {
  label: string;
  help: React.ReactNode;
  name: string;
  /** Whether a credential is already saved. Never the credential itself. */
  stored: boolean;
  required: boolean;
  errors?: string[];
  defaultValue: string;
}) {
  // Open when there is nothing stored to keep.
  //
  // The defaultValue clause only matters on a remount — switching auth type away
  // and back after a failed submit, where state.data still holds what was typed.
  // An ordinary failed submit does not remount this, so it simply keeps the
  // state it already had; the initializer is not what preserves that.
  const [replacing, setReplacing] = useState(!stored || defaultValue !== "");

  if (replacing) {
    return (
      <Field label={label} help={help} errors={errors} required={required}>
        {(props) => (
          <Flex gap="2" align="center">
            <TextField.Root
              {...props}
              type="password"
              name={name}
              autoComplete="new-password"
              required={required}
              defaultValue={defaultValue}
              size="3"
              style={{ flex: 1 }}
            />
            {stored && (
              <Button
                type="button"
                size="2"
                variant="soft"
                color="gray"
                onClick={() => setReplacing(false)}
              >
                Keep current
              </Button>
            )}
          </Flex>
        )}
      </Field>
    );
  }

  return (
    <Field label={label} help={help} errors={errors} group>
      <Flex
        align="center"
        justify="between"
        gap="3"
        p="3"
        style={{
          border: "1px solid var(--gray-6)",
          backgroundColor: "var(--gray-2)",
        }}
      >
        <Flex align="center" gap="2">
          <CheckIcon color="var(--green-11)" />
          <Text size="2" weight="medium">
            Stored
          </Text>
        </Flex>
        <Button
          type="button"
          size="2"
          variant="soft"
          onClick={() => setReplacing(true)}
        >
          Replace…
        </Button>
      </Flex>
    </Field>
  );
}
