import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorkflowSnippet } from "./WorkflowSnippet";
import { githubWorkflowStep } from "@/lib/services/github-workflow";

/**
 * The step a trusted workflow adds to act as a service account, shown the
 * moment the trust exists — under the create form and in the trust dialog.
 * It names the account in the role ARN and points the AWS action at the data
 * proxy; nothing in it is secret and nothing expires, so the same lines serve
 * every run. The copy button takes the whole step.
 */
const meta = {
  title: "Features/Service accounts/WorkflowSnippet",
  component: WorkflowSnippet,
  parameters: { layout: "padded" },
} satisfies Meta<typeof WorkflowSnippet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    subject: "repo:miskatonic/climate-data:ref:refs/heads/main",
    step: githubWorkflowStep("https://data.source.coop", "miskatonic--nightly-sync"),
  },
};

/**
 * A subject in GitHub's immutable form, pinned to an environment, is long.
 * The block scrolls sideways rather than wrapping the YAML.
 */
export const ImmutableSubject: Story = {
  args: {
    subject: "repo:miskatonic@8123456/climate-data@9456789:environment:production",
    step: githubWorkflowStep("https://data.source.coop", "miskatonic--archive-mirror"),
  },
};
