"use client";

import { useEffect, useState } from "react";
import { Box, Code, Flex, Link, SegmentedControl, Text, TextField } from "@radix-ui/themes";
import { Field } from "@/components/core";
import { GITHUB_ACTIONS_ISSUER } from "@/types";

export interface GithubWorkflow {
  /** As the user typed it, e.g. `octocat/hello-world`. */
  repository: string;
  /**
   * How GitHub names the repository in its tokens, looked up from the typed
   * one — `octocat@583231/Hello-World@1296269` once it signs with ids. Unset
   * when GitHub doesn't say, and the repository is then used as typed.
   */
  tokenRepository?: string;
  kind: "branch" | "tag" | "environment";
  /** A branch, tag or environment name. A full `refs/…` ref is taken as is. */
  value: string;
}

export const NEW_GITHUB_WORKFLOW: GithubWorkflow = {
  repository: "",
  kind: "branch",
  value: "main",
};

/** Where GitHub explains which subject a job's token carries. */
const SUBJECT_CLAIMS_DOCS =
  "https://docs.github.com/en/actions/reference/security/oidc#example-subject-claims";

/** GitHub's announcement of repositories named by id in their tokens. */
const IMMUTABLE_SUBJECTS_DOCS =
  "https://github.blog/changelog/2026-04-23-immutable-subject-claims-for-github-actions-oidc-tokens/";

const DocsLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} target="_blank" rel="noopener noreferrer" underline="always">
    {children}
  </Link>
);

const KINDS = {
  branch: { label: "Branch", placeholder: "main", ref: "refs/heads/" },
  tag: { label: "Tag", placeholder: "v1.0", ref: "refs/tags/" },
  environment: { label: "Environment", placeholder: "production", ref: undefined },
} as const;

/** GitHub's `sub` claim for the workflow, exactly as its token will carry it. */
export const githubSubject = (w: GithubWorkflow) => {
  const prefix = KINDS[w.kind].ref;
  const context =
    prefix === undefined
      ? `environment:${w.value}`
      : `ref:${w.value.startsWith("refs/") ? w.value : prefix + w.value}`;
  return `repo:${w.tokenRepository ?? w.repository}:${context}`;
};

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
 * Names one workflow: a repository, and the branch, tag or environment its
 * runs sign in from. Shows the exact condition that will be trusted, since
 * that — not the fields — is what the token has to match.
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
  // The typed name stays in the field; the subject uses the one GitHub's
  // tokens carry, so nobody has to know which form their repository signs with.
  useEffect(() => {
    if (setting && setting.repository !== workflow.tokenRepository)
      onChange({ ...workflow, tokenRepository: setting.repository });
  }, [setting, workflow, onChange]);
  const kind = KINDS[workflow.kind];
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
                <Code size="1">owner/repo</Code>, or with its permanent ids as{" "}
                <Code size="1">owner@123/repo@456</Code>.{" "}
                <DocsLink href={IMMUTABLE_SUBJECTS_DOCS}>About repository ids</DocsLink>
              </>
            }
          >
            <TextField.Root
              id={`${id}-repo`}
              size="2"
              placeholder="owner/repo"
              value={workflow.repository}
              onChange={(e) =>
                onChange({ ...workflow, repository: e.target.value, tokenRepository: undefined })
              }
            />
          </Field>
        </Box>
        {trailing}
      </Flex>
      {(workflow.tokenRepository ?? workflow.repository).includes("@") && (
        <Text size="1" color="gray">
          GitHub identifies this repository by its permanent ids, so the trust holds if it&apos;s
          renamed, and a new repository given its old name can&apos;t use it.
        </Text>
      )}
      {setting && !setting.standard && (
        <Text size="1" color="amber">
          This repository customizes its subject claim, so its tokens may not carry the subject
          below. Only subjects shaped like GitHub&apos;s default can be trusted.
        </Text>
      )}
      {setting === null && (
        <Text size="1" color="gray" style={{ wordBreak: "break-all" }}>
          GitHub doesn&apos;t show this repository publicly. If it&apos;s private, run this and
          enter what it prints after <Code size="1">repo:</Code> as the repository:{" "}
          <Code size="1">{ghSubjectPrefixCommand(workflow.repository)}</Code>
        </Text>
      )}
      {/* Stacked, so the name always starts a line of its own rather than
          squeezing in beside the choice when it fits. */}
      <Flex direction="column" gap="3" align="start">
        <Field
          label="Allow runs from"
          htmlFor={`${id}-kind`}
          group
          help={
            <>
              GitHub decides which a run counts as: a job with an{" "}
              <Code size="1">environment:</Code> line is identified by its environment, any other
              by its branch or tag. Pull request runs can&apos;t sign in.{" "}
              <DocsLink href={SUBJECT_CLAIMS_DOCS}>See GitHub&apos;s examples</DocsLink>
            </>
          }
        >
          {(props) => (
            <SegmentedControl.Root
              aria-labelledby={props["aria-labelledby"]}
              value={workflow.kind}
              onValueChange={(next) =>
                onChange({
                  ...workflow,
                  kind: next as GithubWorkflow["kind"],
                  value: next === "branch" ? "main" : "",
                })
              }
            >
              {Object.entries(KINDS).map(([value, { label }]) => (
                <SegmentedControl.Item key={value} value={value}>
                  {label}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl.Root>
          )}
        </Field>
        <Box width="100%">
          <Field label={kind.label} htmlFor={`${id}-value`} required>
            <TextField.Root
              id={`${id}-value`}
              size="2"
              placeholder={kind.placeholder}
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
