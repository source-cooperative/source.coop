import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { IconButton } from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import { GithubWorkflowFields, NEW_GITHUB_WORKFLOW } from "./GithubWorkflowFields";

/**
 * Names one GitHub workflow: a repository, pinned to a ref or an environment.
 * The exact subject the trust will match is spelled out under the fields as
 * you type, since that string — not the fields — is what the token has to
 * match. Under the ref or environment, a line says what form it takes — a
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

/** As the create form adds it: no repository yet, the default branch pinned. */
export const Empty: Story = {
  args: { workflow: NEW_GITHUB_WORKFLOW },
};

/**
 * A public repository typed the short way. Once you stop typing, GitHub's
 * public API is asked for its ids, and the form offers the immutable name —
 * `octocat@583231/Hello-World@1296269` — with a button that puts it in the
 * field. Whether a repository's tokens carry that form is a setting only its
 * admins can read, so the form offers it rather than switching to it.
 */
export const PublicRepository: Story = {
  args: { workflow: { ...NEW_GITHUB_WORKFLOW, repository: "octocat/Hello-World" } },
};

/**
 * A repository GitHub doesn't show publicly — private, or not there at all.
 * Its ids can't be looked up anonymously, so the form gives the `gh` command
 * that prints its immutable name for anyone who can see it.
 */
export const PrivateRepository: Story = {
  args: {
    workflow: { ...NEW_GITHUB_WORKFLOW, repository: "octocat/a-private-repository" },
  },
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
