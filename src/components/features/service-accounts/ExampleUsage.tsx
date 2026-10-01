"use client";

import { Box, Button, Dialog, Flex, Text } from "@radix-ui/themes";
import { CopyToClipboard } from "@/components/core/CopyToClipboard";
import { highlightLine, type Language, type TokenKind } from "./highlight";

// Radix colour steps, so the snippet reads in light and dark alike.
const COLOURS: Record<TokenKind, string | undefined> = {
  comment: "var(--gray-10)",
  key: "var(--blue-11)",
  keyword: "var(--purple-11)",
  punctuation: "var(--gray-10)",
  value: "var(--green-11)",
  plain: undefined,
};

/**
 * What software adds to sign in one way, ready to paste — a workflow's step,
 * or the variables for a key — in a modal opened from "Example usage" in the
 * row's menu. Nothing in it is secret.
 */
export function ExampleUsage({
  title,
  intro,
  code,
  language,
  open,
  onOpenChange,
}: {
  title: string;
  /** The line above the code: where it goes. */
  intro: React.ReactNode;
  code: string;
  language: Language;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 720 }} aria-describedby={undefined}>
        <Dialog.Title>{title}</Dialog.Title>
        <Flex direction="column" gap="3">
          <Text size="2">{intro}</Text>
          <Box position="relative">
            <Box position="absolute" top="3" right="3">
              <CopyToClipboard text={code} />
            </Box>
            {/* Long lines wrap, clear of the copy button, rather than scroll
                under it; copying takes the unwrapped text. */}
            <Box
              asChild
              p="3"
              pr="7"
              style={{
                margin: 0,
                background: "var(--gray-3)",
                borderRadius: "var(--radius-2)",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                fontFamily: "var(--code-font-family)",
                fontSize: "var(--font-size-1)",
                lineHeight: 1.6,
              }}
            >
              <pre>
                {code.split("\n").map((line, i) => (
                  // The line's own indent becomes padding, so a wrapped
                  // remainder hangs just inside it instead of at the margin.
                  <div
                    key={i}
                    style={{
                      paddingLeft: `${line.search(/\S|$/) + 2}ch`,
                      textIndent: "-2ch",
                    }}
                  >
                    {highlightLine(line.trimStart(), language).map((token, j) => (
                      <span key={j} style={{ color: COLOURS[token.kind] }}>
                        {token.text}
                      </span>
                    ))}
                  </div>
                ))}
              </pre>
            </Box>
          </Box>
        </Flex>
        <Flex justify="end" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
