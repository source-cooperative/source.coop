"use client";

import { Box, Code, Flex, Select, Text, TextField } from "@radix-ui/themes";
import { Field } from "@/components/core";

export interface GithubWorkflow {
  repository: string;
  kind: "ref" | "environment";
  value: string;
}

export const NEW_GITHUB_WORKFLOW: GithubWorkflow = {
  repository: "",
  kind: "ref",
  value: "refs/heads/main",
};

/** GitHub's `sub` claim for the workflow, exactly as its token will carry it. */
export const githubSubject = (w: GithubWorkflow) =>
  `repo:${w.repository}:${w.kind}:${w.value}`;

/**
 * Names one workflow: a repository, pinned to a ref or an environment. Shows
 * the exact subject that will be bound, since that string — not the fields —
 * is what the token has to match.
 */
export function GithubWorkflowFields({
  id,
  workflow,
  onChange,
  trailing,
}: {
  /** Prefix for the field ids, unique per workflow on the page. */
  id: string;
  workflow: GithubWorkflow;
  onChange: (next: GithubWorkflow) => void;
  /** Rendered after the fields, on the same row — a Remove button, say. */
  trailing?: React.ReactNode;
}) {
  return (
    <Flex direction="column" gap="3">
      <Flex gap="3" wrap="wrap" align="end">
        <Box style={{ flex: "1 1 220px" }}>
          <Field label="Repository" htmlFor={`${id}-repo`} required>
            <TextField.Root
              id={`${id}-repo`}
              size="2"
              placeholder="owner/repo"
              value={workflow.repository}
              onChange={(e) => onChange({ ...workflow, repository: e.target.value })}
            />
          </Field>
        </Box>
        <Box style={{ flex: "0 0 150px" }}>
          <Field label="Pinned to" htmlFor={`${id}-kind`}>
            <Select.Root
              value={workflow.kind}
              onValueChange={(kind) =>
                onChange({
                  ...workflow,
                  kind: kind as GithubWorkflow["kind"],
                  value: kind === "ref" ? "refs/heads/main" : "",
                })
              }
            >
              <Select.Trigger id={`${id}-kind`} />
              <Select.Content>
                <Select.Item value="ref">A ref</Select.Item>
                <Select.Item value="environment">An environment</Select.Item>
              </Select.Content>
            </Select.Root>
          </Field>
        </Box>
        <Box style={{ flex: "1 1 200px" }}>
          <Field
            label={workflow.kind === "ref" ? "Ref" : "Environment"}
            htmlFor={`${id}-value`}
            required
          >
            <TextField.Root
              id={`${id}-value`}
              size="2"
              placeholder={workflow.kind === "ref" ? "refs/heads/main" : "production"}
              value={workflow.value}
              onChange={(e) => onChange({ ...workflow, value: e.target.value })}
            />
          </Field>
        </Box>
        {trailing}
      </Flex>
      <Text size="1" color="gray">
        Binds <Code>{githubSubject(workflow)}</Code>
      </Text>
    </Flex>
  );
}
