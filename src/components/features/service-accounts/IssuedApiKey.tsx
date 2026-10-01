"use client";

import { Callout, Code, Flex, Text } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { CopyToClipboard } from "@/components/core/CopyToClipboard";
import { maskedApiKey, type ServiceAccountKey } from "@/types";

/**
 * A key just issued, shown the one time it ever is: the warning that says so,
 * the key with a copy button, and the masked form it is listed under after.
 */
export function IssuedApiKey({ apiKey, record }: { apiKey: string; record: ServiceAccountKey }) {
  return (
    <Flex direction="column" gap="3">
      <Callout.Root color="grass">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>
          <Text size="2" weight="medium">
            Copy the key now — this is the only time it is shown.
          </Text>
        </Callout.Text>
      </Callout.Root>
      <Flex align="center" gap="2">
        <Code size="2" style={{ wordBreak: "break-all" }}>
          {apiKey}
        </Code>
        <CopyToClipboard text={apiKey} />
      </Flex>
      <Text size="1" color="gray">
        Listed as <Code size="1">{maskedApiKey(record)}</Code> from now on: its last six
        characters, to match against the key you hold.
      </Text>
    </Flex>
  );
}
