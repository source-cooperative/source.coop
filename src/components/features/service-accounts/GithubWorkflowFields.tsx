"use client";

import { useEffect, useState } from "react";
import { Box, Button, Code, Flex, Link, SegmentedControl, Text, TextField } from "@radix-ui/themes";
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

/** Where GitHub shows the subject each kind of ref or environment produces. */
const SUBJECT_CLAIMS_DOCS =
  "https://docs.github.com/en/actions/reference/security/oidc#example-subject-claims";

/** GitHub's announcement of the `owner@id/repo@id` subject, and which repositories get it. */
const IMMUTABLE_SUBJECTS_DOCS =
  "https://github.blog/changelog/2026-04-23-immutable-subject-claims-for-github-actions-oidc-tokens/";

const ImmutableSubjectsLink = () => (
  <Link href={IMMUTABLE_SUBJECTS_DOCS} target="_blank" rel="noopener noreferrer" underline="always">
    immutable subjects
  </Link>
);

/** GitHub's `sub` claim for the workflow, exactly as its token will carry it. */
export const githubSubject = (w: GithubWorkflow) =>
  `repo:${w.repository}:${w.kind}:${w.value}`;

/** A repository named the mutable way, `owner/repo`. */
const SHORT_REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/** Prints a repository's immutable name, for one the public API can't see. */
const ghImmutableRepositoryCommand = (repository: string) =>
  `gh api repos/${repository} --jq '"\\(.owner.login)@\\(.owner.id)/\\(.name)@\\(.id)"'`;

/**
 * The immutable name of a repository typed the short way, from GitHub's public
 * API: `owner@id/repo@id`, or `null` when GitHub doesn't show it — a private
 * repository, or none by that name. `undefined` until the answer for the
 * current value arrives. Asked from the browser, so the anonymous rate limit
 * is the viewer's own.
 */
function useImmutableRepository(repository: string) {
  const [answer, setAnswer] = useState<{ repository: string; immutable: string | null }>();
  useEffect(() => {
    if (!SHORT_REPOSITORY.test(repository)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`https://api.github.com/repos/${repository}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((r) =>
          setAnswer({
            repository,
            immutable: r ? `${r.owner.login}@${r.owner.id}/${r.name}@${r.id}` : null,
          })
        )
        .catch((e) => e.name !== "AbortError" && setAnswer({ repository, immutable: null }));
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [repository]);
  return answer?.repository === repository ? answer.immutable : undefined;
}

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
  const immutable = useImmutableRepository(workflow.repository);
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
                if its tokens carry <ImmutableSubjectsLink />
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
      {immutable && (
        <Flex gap="2" align="center" wrap="wrap">
          <Text size="1" color="gray">
            Repositories created after July 2026 sign tokens with their ids. If this one does, it
            is <Code size="1">{immutable}</Code>
          </Text>
          <Button
            type="button"
            size="1"
            variant="soft"
            onClick={() => onChange({ ...workflow, repository: immutable })}
          >
            Use it
          </Button>
        </Flex>
      )}
      {immutable === null && (
        <Text size="1" color="gray" style={{ wordBreak: "break-all" }}>
          GitHub doesn&apos;t show this repository publicly. If it&apos;s private and its tokens
          carry <ImmutableSubjectsLink />, this prints the name to use:{" "}
          <Code size="1">{ghImmutableRepositoryCommand(workflow.repository)}</Code>
        </Text>
      )}
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
            help={
              <>
                {workflow.kind === "ref" ? (
                  <>
                    The full ref the workflow runs on: a branch as{" "}
                    <Code size="1">refs/heads/main</Code>, a tag as{" "}
                    <Code size="1">refs/tags/v1.0</Code>.
                  </>
                ) : (
                  <>The name of the GitHub environment the job runs in.</>
                )}{" "}
                <Link href={SUBJECT_CLAIMS_DOCS} target="_blank" rel="noopener noreferrer" underline="always">
                  See GitHub&apos;s examples
                </Link>
              </>
            }
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
