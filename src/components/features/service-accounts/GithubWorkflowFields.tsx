"use client";

import { useEffect, useState } from "react";
import {
  CheckCircledIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import {
  Box,
  Button,
  Callout,
  Code,
  Flex,
  Link,
  SegmentedControl,
  Strong,
  Text,
  TextField,
} from "@radix-ui/themes";
import { useTranslations } from "next-intl";
import { Field } from "@/components/core";
import { CopyToClipboard } from "@/components/core/CopyToClipboard";
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

const DocsLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <Link
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    underline="always"
  >
    {children}
  </Link>
);

const KINDS = {
  branch: { labelKey: "kindBranch", placeholder: "main", ref: "refs/heads/" },
  tag: { labelKey: "kindTag", placeholder: "v1.0", ref: "refs/tags/" },
  environment: {
    labelKey: "kindEnvironment",
    placeholder: "production",
    ref: undefined,
  },
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
 * The trust as an AWS-style condition: the subject the trust stores, and the
 * audience the proxy requires of every GitHub token — its own origin — when
 * it's known.
 */
export const githubCondition = (w: GithubWorkflow, audience?: string) => {
  const host = new URL(GITHUB_ACTIONS_ISSUER).host;
  return JSON.stringify(
    {
      StringEquals: {
        ...(audience && { [`${host}:aud`]: audience }),
        [`${host}:sub`]: githubSubject(w),
      },
    },
    null,
    2,
  );
};

/** A repository named the mutable way, `owner/repo`. */
const SHORT_REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/** The settings page that shows a repository's subject prefix to its admins. */
const oidcSettingsUrl = (repository: string) =>
  `https://github.com/${repository}/settings/actions/oidc-configuration`;

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
 * public API: `null` when GitHub doesn't show it — a private repository, or
 * none by that name — and `"unreachable"` when GitHub couldn't be asked, most
 * often because it's rate-limiting the viewer. `undefined` until the answer
 * for the current value arrives. Asked from the browser, so the anonymous
 * rate limit, 60 an hour, is the viewer's own; `retry` asks again.
 */
function useSubjectSetting(repository: string) {
  const [answer, setAnswer] = useState<{
    repository: string;
    setting: SubjectSetting | null | "unreachable";
  }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!SHORT_REPOSITORY.test(repository)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(
        `https://api.github.com/repos/${repository}/actions/oidc/customization/sub`,
        {
          signal: controller.signal,
        },
      )
        .then((res) => {
          if (res.status === 404) return null;
          if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
          return res.json();
        })
        .then((r) =>
          setAnswer({
            repository,
            setting:
              typeof r?.sub_claim_prefix === "string"
                ? {
                    repository: r.sub_claim_prefix.replace(/^repo:/, ""),
                    // A template of exactly these keys, in this order, builds
                    // the default's shape, so it's as trustable as the default.
                    standard:
                      r.use_default ||
                      JSON.stringify(r.include_claim_keys) ===
                        '["repo","context"]',
                  }
                : null,
          }),
        )
        .catch(
          (e) =>
            e.name !== "AbortError" &&
            setAnswer({ repository, setting: "unreachable" }),
        );
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [repository, attempt]);
  return {
    setting: answer?.repository === repository ? answer.setting : undefined,
    retry: () => {
      setAnswer(undefined);
      setAttempt((n) => n + 1);
    },
  };
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
  audience,
}: {
  /** Prefix for the field ids, unique per workflow on the page. */
  id: string;
  workflow: GithubWorkflow;
  onChange: (next: GithubWorkflow) => void;
  /** Rendered at the end of the repository row — a Remove button, say. */
  trailing?: React.ReactNode;
  /** The proxy's origin, the audience it requires of GitHub's tokens. */
  audience?: string;
}) {
  const { setting, retry } = useSubjectSetting(workflow.repository);
  const t = useTranslations("GithubWorkflowFields");
  const found = setting && setting !== "unreachable" ? setting : undefined;
  // The typed name stays in the field; the subject uses the one GitHub's
  // tokens carry, so nobody has to know which form their repository signs with.
  // It lives on the workflow, not derived here, because the forms submit
  // `githubSubject(workflow)`.
  useEffect(() => {
    if (found && found.repository !== workflow.tokenRepository)
      onChange({ ...workflow, tokenRepository: found.repository });
  }, [found, workflow, onChange]);
  const kind = KINDS[workflow.kind];
  return (
    <Flex direction="column" gap="3">
      <Flex gap="3" align="end">
        <Box flexGrow="1">
          <Field
            label={t("repository")}
            htmlFor={`${id}-repo`}
            required
            help={t.rich("repositoryHelp", {
              code: (chunks) => <Code size="1">{chunks}</Code>,
              docs: (chunks) => (
                <DocsLink href={IMMUTABLE_SUBJECTS_DOCS}>{chunks}</DocsLink>
              ),
            })}
          >
            <TextField.Root
              id={`${id}-repo`}
              size="2"
              placeholder="owner/repo"
              value={workflow.repository}
              onChange={(e) =>
                onChange({
                  ...workflow,
                  // GitHub shows the name as a subject prefix, `repo:` and all.
                  repository: e.target.value.trim().replace(/^repo:/, ""),
                  tokenRepository: undefined,
                })
              }
            />
          </Field>
        </Box>
        {trailing}
      </Flex>
      {found?.standard && (
        <Callout.Root size="1" color="green" role="status">
          <Callout.Icon>
            <CheckCircledIcon />
          </Callout.Icon>
          <Callout.Text size="1" style={{ wordBreak: "break-all" }}>
            {t.rich("confirmed", {
              repository: found.repository,
              code: (chunks) => <Code size="1">{chunks}</Code>,
            })}
          </Callout.Text>
        </Callout.Root>
      )}
      {found && !found.standard && (
        <Callout.Root size="1" color="amber" role="alert">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text size="1">
            {t.rich("customized", {
              strong: (chunks) => <Strong>{chunks}</Strong>,
              link: (chunks) => (
                <DocsLink href={oidcSettingsUrl(workflow.repository)}>
                  {chunks}
                </DocsLink>
              ),
            })}
          </Callout.Text>
        </Callout.Root>
      )}
      {(setting === null || setting === "unreachable") && (
        <Callout.Root size="1" color="amber" role="alert">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          {/* Callout.Text is a <p>, which can't hold the list. */}
          <Box>
            {setting === null ? (
              <Callout.Text size="1">
                {t.rich("notVisible", {
                  repository: workflow.repository,
                  repo: (chunks) => (
                    <DocsLink href={`https://github.com/${workflow.repository}`}>
                      {chunks}
                    </DocsLink>
                  ),
                })}
              </Callout.Text>
            ) : (
              <Callout.Text size="1">
                {t.rich("unreachable", {
                  repository: workflow.repository,
                  repo: (chunks) => (
                    <DocsLink href={`https://github.com/${workflow.repository}`}>
                      {chunks}
                    </DocsLink>
                  ),
                  retry: (chunks) => (
                    <Button type="button" size="1" variant="soft" onClick={retry}>
                      {chunks}
                    </Button>
                  ),
                })}
              </Callout.Text>
            )}
            <Text size="1" asChild>
              <ul
                style={{
                  margin: "var(--space-1) 0 0",
                  paddingLeft: "var(--space-4)",
                }}
              >
                <li>
                  {t.rich("findAsAdmin", {
                    strong: (chunks) => <Strong>{chunks}</Strong>,
                    link: (chunks) => (
                      <DocsLink href={oidcSettingsUrl(workflow.repository)}>
                        {chunks}
                      </DocsLink>
                    ),
                  })}
                </li>
                <li>
                  {t.rich("findWithCli", {
                    link: (chunks) => (
                      <DocsLink href="https://cli.github.com">{chunks}</DocsLink>
                    ),
                  })}
                  <Flex gap="2" align="center" mt="1">
                    <Code size="1" style={{ wordBreak: "break-all" }}>
                      {ghSubjectPrefixCommand(workflow.repository)}
                    </Code>
                    <CopyToClipboard
                      text={ghSubjectPrefixCommand(workflow.repository)}
                    />
                  </Flex>
                </li>
              </ul>
            </Text>
          </Box>
        </Callout.Root>
      )}
      {/* Stacked, so the name always starts a line of its own rather than
          squeezing in beside the choice when it fits. */}
      <Flex direction="column" gap="3" align="start">
        <Field
          label={t("allowRunsFrom")}
          htmlFor={`${id}-kind`}
          group
          help={t.rich("allowRunsFromHelp", {
            link: (chunks) => (
              <DocsLink href={SUBJECT_CLAIMS_DOCS}>{chunks}</DocsLink>
            ),
          })}
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
              {Object.entries(KINDS).map(([value, { labelKey }]) => (
                <SegmentedControl.Item key={value} value={value}>
                  {t(labelKey)}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl.Root>
          )}
        </Field>
        <Box width="100%">
          <Field label={t(kind.labelKey)} htmlFor={`${id}-value`} required>
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
          {t("trustsTokensMatching")}
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
          <pre>{githubCondition(workflow, audience)}</pre>
        </Box>
      </Box>
    </Flex>
  );
}
