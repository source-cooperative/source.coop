"use client";

import { Box, Code, Flex, SegmentedControl, Text, TextField } from "@radix-ui/themes";
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
 * the exact subject that will be trusted, since that string — not the fields —
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
  /** Rendered at the end of the repository row — a Remove button, say. */
  trailing?: React.ReactNode;
}) {
  return (
    <Flex direction="column" gap="3">
      <Flex gap="3" align="end">
        <Box flexGrow="1">
          <Field
            label="Repository"
            htmlFor={`${id}-repo`}
            required
            help={
              <>
                <Code size="1">owner/repo</Code>, or <Code size="1">owner@123/repo@456</Code>{" "}
                if its tokens carry immutable subjects
              </>
            }
          >
            <TextField.Root
              id={`${id}-repo`}
              size="2"
              placeholder="owner/repo"
              value={workflow.repository}
              onChange={(e) => onChange({ ...workflow, repository: e.target.value })}
            />
          </Field>
        </Box>
        {trailing}
      </Flex>
      <Flex gap="3" align="end" wrap="wrap">
        <Field label="Pinned to" htmlFor={`${id}-kind`} group>
          {(props) => (
            <SegmentedControl.Root
              aria-labelledby={props["aria-labelledby"]}
              value={workflow.kind}
              onValueChange={(kind) =>
                onChange({
                  ...workflow,
                  kind: kind as GithubWorkflow["kind"],
                  value: kind === "ref" ? "refs/heads/main" : "",
                })
              }
            >
              <SegmentedControl.Item value="ref">Ref</SegmentedControl.Item>
              <SegmentedControl.Item value="environment">Environment</SegmentedControl.Item>
            </SegmentedControl.Root>
          )}
        </Field>
        <Box flexGrow="1" style={{ minWidth: "min(12rem, 100%)" }}>
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
      </Flex>
      <Text size="1" color="gray" style={{ wordBreak: "break-all" }}>
        Trusts <Code size="1">{githubSubject(workflow)}</Code>
      </Text>
    </Flex>
  );
}
