"use client";

import { useState } from "react";
import { Callout, Code, Flex, IconButton, Text, Tooltip } from "@radix-ui/themes";
import { ExclamationTriangleIcon, EyeClosedIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { CopyToClipboard } from "@/components/core/CopyToClipboard";
import { maskedApiKey, type ServiceAccountKey } from "@/types";

/**
 * A key just issued, shown the one time it ever is: the warning that says so,
 * and the key itself. The key starts masked, so a shared screen doesn't leak it;
 * copying always copies the whole key, and showing it is a deliberate click.
 */
export function IssuedApiKey({ apiKey, record }: { apiKey: string; record: ServiceAccountKey }) {
  const [shown, setShown] = useState(false);
  return (
    <Flex direction="column" gap="3">
      <Callout.Root color="grass">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>
          <Text size="2" weight="medium">
            Copy the key now — this is the only time it is available in full.
          </Text>
        </Callout.Text>
      </Callout.Root>
      <Flex align="center" gap="2">
        <Code size="2" style={{ wordBreak: "break-all" }}>
          {shown ? apiKey : maskedApiKey(record)}
        </Code>
        <CopyToClipboard text={apiKey} />
        <Tooltip content={shown ? "Hide key" : "Show key"}>
          <IconButton
            type="button"
            size="1"
            variant="ghost"
            color="gray"
            onClick={() => setShown(!shown)}
            aria-label={shown ? "Hide key" : "Show key"}
            aria-pressed={shown}
          >
            {shown ? <EyeClosedIcon /> : <EyeOpenIcon />}
          </IconButton>
        </Tooltip>
      </Flex>
    </Flex>
  );
}
