import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { IconButton } from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import { GithubWorkflowFields, NEW_GITHUB_WORKFLOW } from "./GithubWorkflowFields";

/**
 * Names one GitHub workflow: a repository, pinned to a ref or an environment.
 * The trust is spelled out under the fields as you type, as the JSON
 * condition a token has to meet — a `StringEquals` on GitHub's `sub` claim —
 * since that string, not the fields, is what the token has to match. Under the ref or environment, a line says what form it takes — a
 * branch as `refs/heads/main`, a tag as `refs/tags/v1.0` — and links to
 * GitHub's examples of the subject each produces. The create form stacks one
 * of these per workflow; the trust dialog shows one.
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
 * A public repository typed the short way. Once you stop typing, GitHub's
 * public API is asked how the repository's tokens name it, and the field is
 * filled in with that name. This one's tokens carry its ids, so
 * `octocat/hello-world` becomes `octocat@583231/Hello-World@1296269`; one
 * whose tokens don't keeps its short name, in GitHub's casing.
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
 * How its tokens name it can't be looked up anonymously, so the form gives
 * the `gh` command that prints it for anyone who can see the repository.
 */
export const PrivateRepository: Story = {
  args: {
    workflow: { ...NEW_GITHUB_WORKFLOW, repository: "octocat/a-private-repository" },
  },
  beforeEach: githubAnswers(404),
};

/**
 * A repository named the immutable way GitHub mints for repositories created
 * after July 2026, pinned to an environment, with the Remove button the create
 * form puts on each card.
 */
export const ImmutableRepositoryWithRemove: Story = {
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
