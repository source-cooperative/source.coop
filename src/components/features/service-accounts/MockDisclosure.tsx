"use client";

import React from "react";
import { Box, Text } from "@radix-ui/themes";

/**
 * Collapsed container for everything in the #491 mock that a real screen
 * would not show — the rows a submit would write, the caveats, the "this
 * isn't wired up" disclaimer.
 *
 * Native <details> rather than a Radix accordion: it opens without JavaScript,
 * is keyboard- and screen-reader-accessible for free, and survives being
 * rendered inside a server component.
 */
export function MockDisclosure({
  summary,
  children,
}: {
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      asChild
      style={{
        border: "1px dashed var(--amber-8)",
        background: "var(--amber-2)",
      }}
    >
      <details>
        <summary
          style={{
            cursor: "pointer",
            padding: "10px 14px",
            listStyle: "revert",
          }}
        >
          <Text size="2" weight="medium">
            {summary}
          </Text>
        </summary>
        <Box p="4" pt="2">
          {children}
        </Box>
      </details>
    </Box>
  );
}
