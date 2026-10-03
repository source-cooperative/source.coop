import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ExampleUsage, GITHUB_WORKFLOW_INTRO } from "./ExampleUsage";
import { apiKeyEnvironment, githubWorkflow } from "@/lib/services/service-account-usage";

/**
 * What software adds to sign in as a service account, ready to paste, opened
 * from "Example usage" in the menu on each way it signs in. For a trusted
 * GitHub workflow, it is a whole workflow file whose two Source Cooperative
 * parts — the `env` block pointing AWS clients at the data proxy, and the
 * sign-in step using AWS's own `configure-aws-credentials` action — stay at
 * full strength while the scaffolding around them fades, so it is plain what
 * to carry into a workflow that already exists; for a working API key, it is the
 * variables that point any AWS SDK or the AWS CLI at the key saved to a file.
 * Each names the account in the role ARN and points at the data proxy;
 * nothing in either is secret. Keys, values and comments are coloured, and the
 * copy button in the block's corner takes all of it.
 */
const meta = {
  title: "Features/Service accounts/ExampleUsage",
  component: ExampleUsage,
  // Each story opens a modal; on the docs page it gets a frame of its own, so
  // the modal stays inside its preview instead of covering the page.
  parameters: { layout: "padded", docs: { story: { inline: false, iframeHeight: 640 } } },
  // Open, as choosing it from the menu leaves it; Close does nothing here.
  args: { open: true, onOpenChange: () => {} },
} satisfies Meta<typeof ExampleUsage>;

export default meta;
type Story = StoryObj<typeof meta>;

const REF = "repo:miskatonic/climate-data:ref:refs/heads/main";
const ENVIRONMENT = "repo:miskatonic@8123456/climate-data@9456789:environment:production";

/**
 * The workflow sets `AWS_ENDPOINT_URL` for every job and step — the general
 * variable, which more SDKs and tools honour than the S3-only one — and the
 * sign-in step reads the proxy's address from it. It runs nightly and on
 * demand, and a comment above the step marks where the job's own setup goes.
 */
export const GithubWorkflow: Story = {
  args: {
    title: "Sign in from this workflow",
    intro: GITHUB_WORKFLOW_INTRO,
    ...githubWorkflow("https://data.source.coop", "miskatonic--nightly-sync", REF),
    language: "yaml",
  },
};

/**
 * A workflow trusted when it runs in a GitHub environment. The job names the
 * environment, without which GitHub puts the ref in the token's subject rather
 * than the environment, and the trust wouldn't match — so that line stays at
 * full strength too, with a comment naming the trust it satisfies.
 */
export const GithubWorkflowInAnEnvironment: Story = {
  args: {
    ...GithubWorkflow.args,
    ...githubWorkflow("https://data.source.coop", "miskatonic--nightly-sync", ENVIRONMENT),
  },
};

export const ApiKey: Story = {
  args: {
    title: "Sign in with HPC cron job",
    intro: "Save the key to a file, then point any AWS SDK or the AWS CLI at it:",
    code: apiKeyEnvironment("https://data.source.coop", "miskatonic--nightly-sync"),
    language: "shell",
  },
};
