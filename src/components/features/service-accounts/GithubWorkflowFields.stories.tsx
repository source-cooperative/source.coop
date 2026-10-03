import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { IconButton } from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import { GithubWorkflowFields, NEW_GITHUB_WORKFLOW } from "./GithubWorkflowFields";

/**
 * Names one GitHub workflow: a repository, and the branch, tag or environment
 * its runs sign in from. Each is typed as a plain name — `main`, `v1.0`,
 * `production` — and a line under the choice says how GitHub picks one for a
 * run: a job with an `environment:` line is identified by its environment,
 * any other by its branch or tag, and runs triggered by a pull request can't
 * sign in, since their tokens name none of the three. A full ref such as
 * `refs/pull/1/merge` typed as the branch is used as it is.
 *
 * Once you stop typing a repository, GitHub is asked how its tokens name it:
 * a green note confirms the answer, and an amber box says when GitHub can't
 * be asked — a private repository — and the two ways to find out instead.
 *
 * The trust is spelled out under the fields as you type, as the JSON
 * condition a token has to meet: a `StringEquals` on GitHub's `aud` claim,
 * which must name the data proxy, and on its `sub` claim. The create form
 * stacks one of these per workflow; the trust dialog shows one.
 *
 * The component is controlled, so these stories keep the workflow in state
 * and the fields can be typed into.
 */
const meta = {
  title: "Features/Service accounts/GithubWorkflowFields",
  component: GithubWorkflowFields,
  parameters: { layout: "padded" },
  args: { id: "wf", onChange: fn(), audience: "https://data.source.coop" },
  render: function Controlled(args) {
    const [workflow, setWorkflow] = useState(args.workflow);
    return <GithubWorkflowFields {...args} workflow={workflow} onChange={setWorkflow} />;
  },
} satisfies Meta<typeof GithubWorkflowFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Answers the lookup for the story's own repository with what GitHub returned
 * for it when the story was written, so the story opens the same way every
 * time; any other repository typed in is looked up on GitHub itself.
 */
const githubAnswers = (repository: string, status: number, body?: object) => () => {
  const real = window.fetch;
  window.fetch = async (input, init) =>
    String(input).includes(`/repos/${repository}/`)
      ? new Response(JSON.stringify(body ?? {}), { status })
      : real(input, init);
  return () => {
    window.fetch = real;
  };
};

/**
 * As the create form adds it: no repository yet, the default branch pinned.
 * Type any repository to see how GitHub's tokens name it.
 */
export const Empty: Story = {
  args: { workflow: NEW_GITHUB_WORKFLOW },
};

/**
 * A public repository. Once you stop typing, GitHub's public API is asked how
 * the repository's tokens name it, and the condition uses that name while the
 * field keeps what you typed. This one's tokens carry its permanent ids —
 * `alukach@897290/source-coop-upload-test@1400565438` — so a line explains
 * what that buys: the trust survives a rename, and a new repository given the
 * old name can't use it. A repository whose tokens don't carry ids shows no
 * such line, and is named in its tokens with GitHub's own capitalization.
 */
export const PublicRepository: Story = {
  args: {
    workflow: { ...NEW_GITHUB_WORKFLOW, repository: "alukach/source-coop-upload-test" },
  },
  beforeEach: githubAnswers("alukach/source-coop-upload-test", 200, {
    use_default: true,
    use_immutable_subject: true,
    sub_claim_prefix: "repo:alukach@897290/source-coop-upload-test@1400565438",
  }),
};

/**
 * A public repository with its own subject template. Its tokens may name
 * something other than the repository and ref, which a trust can't match, so
 * the form says so.
 */
export const CustomizedSubject: Story = {
  args: { workflow: { ...NEW_GITHUB_WORKFLOW, repository: "cli/cli" } },
  beforeEach: githubAnswers("cli/cli", 200, {
    use_default: false,
    use_immutable_subject: false,
    include_claim_keys: ["repository_owner_id", "repository_id", "context"],
    sub_claim_prefix: "repo:cli/cli",
  }),
};

/**
 * A repository GitHub doesn't show publicly — private, or not there at all.
 * How its tokens name it can't be looked up anonymously, so the condition
 * uses the name as typed. The form links to the repository's OIDC settings,
 * where its admins see the **Default subject claim prefix** to paste in —
 * `repo:` and all, which the field drops — and, for anyone else who can see
 * the repository, gives a `gh` command that prints the same, with a button
 * that copies it.
 */
export const PrivateRepository: Story = {
  args: {
    workflow: { ...NEW_GITHUB_WORKFLOW, repository: "source-cooperative/a-private-repository" },
  },
  beforeEach: githubAnswers("source-cooperative/a-private-repository", 404),
};

/**
 * Runs for a release tag, in a repository whose tokens name it the short way,
 * `owner/repo`.
 */
export const Tag: Story = {
  args: {
    workflow: { repository: "source-cooperative/source.coop", kind: "tag", value: "v1.0" },
  },
  beforeEach: githubAnswers("source-cooperative/source.coop", 200, {
    use_default: true,
    use_immutable_subject: false,
    sub_claim_prefix: "repo:source-cooperative/source.coop",
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
      repository: "alukach@897290/source-coop-upload-test@1400565438",
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
