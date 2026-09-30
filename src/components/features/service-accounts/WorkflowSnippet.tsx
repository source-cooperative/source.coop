"use client";

import { Box, Code, Flex, Text } from "@radix-ui/themes";
import { CopyToClipboard } from "@/components/core/CopyToClipboard";

/**
 * What a workflow's job adds to act as the account, ready to paste: the
 * configure-aws-credentials step pointed at the data proxy and naming the
 * account. It carries no secret and nothing that expires: the account's
 * trust in the workflow's subject is what lets it in, so the same lines serve
 * every run.
 */
export function WorkflowSnippet({ subject, step }: { subject: string; step: string }) {
  return (
    <Flex direction="column" gap="2">
      <Flex justify="between" align="center" gap="2">
        <Text size="2">
          Add to the job in <Code>{subject}</Code>, before it uses the data:
        </Text>
        <CopyToClipboard text={step} />
      </Flex>
      <Box asChild p="3" style={{ background: "var(--gray-2)", overflowX: "auto" }}>
        <pre style={{ margin: 0 }}>
          <Code size="1" variant="ghost">
            {step}
          </Code>
        </pre>
      </Box>
    </Flex>
  );
}
