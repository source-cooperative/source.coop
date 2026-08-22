"use client";

import { Box, Flex, Text } from "@radix-ui/themes";
import { CopyToClipboard } from "@/components/core/CopyToClipboard";

/**
 * Multi-line code block. Uses a single <pre> with one container background
 * rather than per-line inline code, so long snippets read as one block.
 */
export function CodeBlock({
  title,
  language,
  lines,
}: {
  title?: string;
  language?: string;
  lines: string[];
}) {
  const text = lines.join("\n");
  return (
    <Box>
      {title && (
        <Flex justify="between" align="center" mb="1">
          <Text size="2" weight="medium">
            {title}
          </Text>
          <Flex align="center" gap="2">
            {language && (
              <Text size="1" color="gray">
                {language}
              </Text>
            )}
            <CopyToClipboard text={text} />
          </Flex>
        </Flex>
      )}
      <Box
        style={{
          background: "var(--gray-2)",
          border: "1px solid var(--gray-6)",
          overflowX: "auto",
        }}
        p="3"
      >
        <pre
          style={{
            margin: 0,
            fontFamily: "var(--code-font-family)",
            fontSize: "13px",
            lineHeight: 1.6,
            whiteSpace: "pre",
            background: "none",
          }}
        >
          {text}
        </pre>
      </Box>
    </Box>
  );
}
