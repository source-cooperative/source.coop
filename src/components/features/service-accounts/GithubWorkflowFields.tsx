"use client";

import { useEffect, useState } from "react";
import { Box, Code, Flex, Link, SegmentedControl, Text, TextField } from "@radix-ui/themes";
import { Field } from "@/components/core";
import { GITHUB_ACTIONS_ISSUER } from "@/types";

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

/**
 * The trust as an AWS-style condition. The subject is the whole of it: the
 * issuer is GitHub's, and the audience is checked against the proxy for every
 * token alike.
 */
export const githubCondition = (w: GithubWorkflow) =>
  JSON.stringify(
    { StringEquals: { [`${new URL(GITHUB_ACTIONS_ISSUER).host}:sub`]: githubSubject(w) } },
    null,
    2
  );

/** A repository named the mutable way, `owner/repo`. */
const SHORT_REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/** Prints how a repository's tokens name it, for one the public API can't see. */
const ghSubjectPrefixCommand = (repository: string) =>
  `gh api repos/${repository}/actions/oidc/customization/sub --jq .sub_claim_prefix`;

interface SubjectSetting {
  /** As the tokens name it: `owner/repo`, or `owner@id/repo@id` once they carry ids. */
  repository: string;
  /** False when the repository has its own subject template. */
  standard: boolean;
}

/**
 * How a repository typed the short way is named in its tokens, from GitHub's
 * public API, or `null` when GitHub doesn't show it — a private repository,
 * or none by that name. `undefined` until the answer for the current value
 * arrives. Asked from the browser, so the anonymous rate limit is the
 * viewer's own.
 */
function useSubjectSetting(repository: string) {
  const [answer, setAnswer] = useState<{ repository: string; setting: SubjectSetting | null }>();
  useEffect(() => {
    if (!SHORT_REPOSITORY.test(repository)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`https://api.github.com/repos/${repository}/actions/oidc/customization/sub`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((r) =>
          setAnswer({
            repository,
            setting: r && {
              repository: r.sub_claim_prefix.replace(/^repo:/, ""),
              standard: r.use_default,
            },
          })
        )
        .catch((e) => e.name !== "AbortError" && setAnswer({ repository, setting: null }));
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [repository]);
  return answer?.repository === repository ? answer.setting : undefined;
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
  const setting = useSubjectSetting(workflow.repository);
  // The field takes the name exactly as the tokens carry it, ids included when
  // GitHub signs with them, so the subject below is the one to trust.
  useEffect(() => {
    if (setting && setting.repository !== workflow.repository)
      onChange({ ...workflow, repository: setting.repository });
  }, [setting, workflow, onChange]);
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
      {setting && !setting.standard && (
        <Text size="1" color="amber">
          This repository customizes its subject claim, so its tokens may not carry the subject
          below. Only subjects shaped like GitHub&apos;s default can be trusted.
        </Text>
      )}
      {setting === null && (
        <Text size="1" color="gray" style={{ wordBreak: "break-all" }}>
          GitHub doesn&apos;t show this repository publicly. If it&apos;s private, this prints how
          its tokens name it — enter what follows <Code size="1">repo:</Code> above:{" "}
          <Code size="1">{ghSubjectPrefixCommand(workflow.repository)}</Code>
        </Text>
      )}
      {/* Stacked, so the ref or environment always starts a line of its own
          rather than squeezing in beside the choice when it fits. */}
      <Flex direction="column" gap="3" align="start">
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
        <Box width="100%">
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
      <Box>
        <Text as="p" size="1" color="gray" mb="1">
          Trusts tokens matching
        </Text>
        <Box
          asChild
          p="3"
          style={{
            margin: 0,
            background: "var(--gray-3)",
            borderRadius: "var(--radius-2)",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            fontFamily: "var(--code-font-family)",
            fontSize: "var(--font-size-1)",
          }}
        >
          <pre>{githubCondition(workflow)}</pre>
        </Box>
      </Box>
    </Flex>
  );
}
