"use client";

import { Box, Code, Flex, Tabs, Text } from "@radix-ui/themes";
import { CopyToClipboard } from "@/components/core/CopyToClipboard";
import { apiKeyEnvironment, githubWorkflowStep } from "@/lib/services/service-account-usage";

function Example({ value, intro, code }: { value: string; intro: React.ReactNode; code: string }) {
  return (
    <Tabs.Content value={value}>
      <Flex direction="column" gap="2" pt="3">
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
    </Tabs.Content>
  );
}

/**
 * How software signs in as a service account, ready to paste, a tab for each
 * way: the step a trusted GitHub workflow adds, and the variables that point
 * any AWS SDK or the AWS CLI at a saved API key. Both name the account and the
 * data proxy and nothing else, so they hold for every workflow and every key.
 */
export function UsageExamples({ accountId, proxyOrigin }: { accountId: string; proxyOrigin: string }) {
  return (
    <Tabs.Root defaultValue="github">
      <Tabs.List>
        <Tabs.Trigger value="github">GitHub Actions</Tabs.Trigger>
        <Tabs.Trigger value="key">API key</Tabs.Trigger>
      </Tabs.List>
      <Example
        value="github"
        intro="Add to the job in a trusted workflow, before it uses the data:"
        code={githubWorkflowStep(proxyOrigin, accountId)}
      />
      <Example
        value="key"
        intro="Save the key to a file, then point any AWS SDK or the AWS CLI at it:"
        code={apiKeyEnvironment(proxyOrigin, accountId)}
      />
    </Tabs.Root>
  );
}
