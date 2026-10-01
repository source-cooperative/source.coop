"use client";

import { Box, Button, Code, Dialog, Flex, Text } from "@radix-ui/themes";
import { CopyToClipboard } from "@/components/core/CopyToClipboard";

/**
 * What software adds to sign in one way, ready to paste — a workflow's step,
 * or the variables for a key — in a modal opened from "Example usage" in the
 * row's menu. Nothing in it is secret.
 */
export function ExampleUsage({
  title,
  intro,
  code,
  open,
  onOpenChange,
}: {
  title: string;
  /** The line above the code: where it goes. */
  intro: React.ReactNode;
  code: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 640 }} aria-describedby={undefined}>
        <Dialog.Title>{title}</Dialog.Title>
        <Flex direction="column" gap="2">
          <Flex justify="between" align="center" gap="2">
            <Text size="2">{intro}</Text>
            <CopyToClipboard text={code} />
          </Flex>
          <Box asChild p="3" style={{ background: "var(--gray-2)", overflowX: "auto" }}>
            <pre style={{ margin: 0 }}>
              <Code size="1" variant="ghost">
                {code}
              </Code>
            </pre>
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
