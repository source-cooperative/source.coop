import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { IconButton } from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import { GithubWorkflowFields, NEW_GITHUB_WORKFLOW } from "./GithubWorkflowFields";

/**
 * Names one GitHub workflow: a repository, and the branch, tag or environment
 * its runs sign in from. The repository is typed after a fixed `github.com/`,
 * and a pasted address keeps only its `owner/repo`. The rest is typed as a plain name — `main`, `v1.0`,
 * `production` — and a line under the choice says how GitHub picks one for a
 * run: a job with an `environment:` line is identified by its environment,
 * any other by its branch or tag, and pull request runs can't sign in. A full
 * ref such as `refs/pull/1/merge` typed as the branch is used as it is.
 *
 * The trust is spelled out under the fields as you type, as the JSON
 * condition a token has to meet — a `StringEquals` on GitHub's `sub` claim —
 * since that string, not the fields, is what the token has to match. The
 * create form stacks one of these per workflow; the trust dialog shows one.
 *
 * The component is controlled, so these stories keep the workflow in state
 * and the fields can be typed into.
 */
const meta = {
  title: "Features/Service accounts/GithubWorkflowFields",
  component: GithubWorkflowFields,
  parameters: { layout: "padded" },
  args: { id: "wf", onChange: fn() },
  render: function Controlled(args) {
    const [workflow, setWorkflow] = useState(args.workflow);
    return <GithubWorkflowFields {...args} workflow={workflow} onChange={setWorkflow} />;
  },
} satisfies Meta<typeof GithubWorkflowFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Answers the subject lookup as GitHub would, so a story doesn't hang on a real repository. */
const githubAnswers = (status: number, body?: object) => () => {
  const real = window.fetch;
  window.fetch = async () => new Response(JSON.stringify(body ?? {}), { status });
  return () => {
    window.fetch = real;
  };
};

/** As the create form adds it: no repository yet, the default branch pinned. */
export const Empty: Story = {
  args: { workflow: NEW_GITHUB_WORKFLOW },
};

/**
 * A public repository. Once you stop typing, GitHub's public API is asked how
 * the repository's tokens name it, and the condition uses that name while the
 * field keeps what you typed. This one's tokens carry its permanent ids —
 * `octocat@583231/Hello-World@1296269` — so a line explains what that buys:
 * the trust survives a rename, and a new repository given the old name can't
 * use it. A repository whose tokens don't carry ids shows no such line, and
 * is named in its tokens with GitHub's own capitalization.
 */
export const PublicRepository: Story = {
  args: { workflow: { ...NEW_GITHUB_WORKFLOW, repository: "octocat/hello-world" } },
  beforeEach: githubAnswers(200, {
    use_default: true,
    use_immutable_subject: true,
    sub_claim_prefix: "repo:octocat@583231/Hello-World@1296269",
  }),
};

/**
 * A public repository with its own subject template. Its tokens may name
 * something other than the repository and ref, which a trust can't match, so
 * the form says so.
 */
export const CustomizedSubject: Story = {
  args: { workflow: { ...NEW_GITHUB_WORKFLOW, repository: "cli/cli" } },
  beforeEach: githubAnswers(200, {
    use_default: false,
    include_claim_keys: ["repository_owner_id", "repository_id", "context"],
    sub_claim_prefix: "repo:cli/cli",
  }),
};

/**
 * A repository GitHub doesn't show publicly — private, or not there at all.
 * How its tokens name it can't be looked up anonymously, so the condition
 * uses the name as typed, and the form gives the `gh` command that prints the
 * right one for anyone who can see the repository.
 */
export const PrivateRepository: Story = {
  args: {
    workflow: { ...NEW_GITHUB_WORKFLOW, repository: "octocat/a-private-repository" },
  },
  beforeEach: githubAnswers(404),
};

/** Runs for a release tag. */
export const Tag: Story = {
  args: {
    workflow: { repository: "miskatonic/climate-data", kind: "tag", value: "v1.0" },
  },
  beforeEach: githubAnswers(200, {
    use_default: true,
    sub_claim_prefix: "repo:miskatonic/climate-data",
  }),
};

/**
 * Jobs in a GitHub environment, for a repository typed straight in by its ids
 * — as someone who already knows its tokens carry them might — with the
 * Remove button the create form puts on each card.
 */
export const EnvironmentWithRemove: Story = {
  args: {
    workflow: {
      repository: "miskatonic@8123456/climate-data@9456789",
      kind: "environment",
      value: "production",
    },
    trailing: (
      <IconButton type="button" variant="soft" color="red" aria-label="Remove workflow">
        <TrashIcon />
      </IconButton>
    ),
  },
};
