import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Code } from "@radix-ui/themes";
import { ExampleUsage } from "./ExampleUsage";
import {
  apiKeyEnvironment,
  githubWorkflow,
  githubWorkflowStep,
} from "@/lib/services/service-account-usage";

/**
 * What software adds to sign in as a service account, ready to paste, opened
 * from "Example usage" in the menu on each way it signs in. For a trusted
 * GitHub workflow, a switch chooses between a whole workflow file and the
 * sign-in step alone, to add to a job that already exists; for a working API
 * key, it is the variables that point any AWS SDK or the AWS CLI at the key
 * saved to a file. Each names the account in the role ARN and points at the
 * data proxy; nothing in either is secret. Keys, values and comments are
 * coloured, and the copy button in the block's corner takes all of whichever
 * form is showing.
 */
const meta = {
  title: "Features/Service accounts/ExampleUsage",
  component: ExampleUsage,
  parameters: { layout: "padded" },
  // Open, as choosing it from the menu leaves it; Close does nothing here.
  args: { open: true, onOpenChange: () => {} },
} satisfies Meta<typeof ExampleUsage>;

export default meta;
type Story = StoryObj<typeof meta>;

const workflowIntro = (subject: string) => (
  <>
    In the repository <Code>{subject}</Code> names, save the full workflow under{" "}
    <Code>.github/workflows/</Code>, or add the step to a job of your own:
  </>
);

const REF = "repo:miskatonic/climate-data:ref:refs/heads/main";
const ENVIRONMENT = "repo:miskatonic@8123456/climate-data@9456789:environment:production";

/**
 * The whole workflow sets `AWS_ENDPOINT_URL_S3` for every job and step, and
 * the sign-in step reads the proxy's address from it.
 */
export const GithubWorkflow: Story = {
  args: {
    title: "Sign in from this workflow",
    intro: workflowIntro(REF),
    code: {
      "Full Workflow": githubWorkflow("https://data.source.coop", "miskatonic--nightly-sync", REF),
      Step: githubWorkflowStep("https://data.source.coop", "miskatonic--nightly-sync", REF),
    },
    language: "yaml",
  },
};

/**
 * The step alone sets `AWS_ENDPOINT_URL_S3` on itself, which reaches no
 * other step, so the comments above it say what the job around it needs.
 */
export const GithubWorkflowStep: Story = {
  args: {
    ...GithubWorkflow.args,
    code: {
      Step: githubWorkflowStep("https://data.source.coop", "miskatonic--nightly-sync", REF),
      "Full Workflow": githubWorkflow("https://data.source.coop", "miskatonic--nightly-sync", REF),
    },
  },
};

/**
 * A workflow trusted when it runs in a GitHub environment. The job names the
 * environment, without which GitHub puts the ref in the token's subject rather
 * than the environment, and the trust wouldn't match.
 */
export const GithubWorkflowInAnEnvironment: Story = {
  args: {
    ...GithubWorkflow.args,
    intro: workflowIntro(ENVIRONMENT),
    code: {
      "Full Workflow": githubWorkflow("https://data.source.coop", "miskatonic--nightly-sync", ENVIRONMENT),
      Step: githubWorkflowStep("https://data.source.coop", "miskatonic--nightly-sync", ENVIRONMENT),
    },
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

/**
 * At phone width long lines wrap rather than scroll, each wrapped remainder
 * hanging just inside its line's indent so the YAML still reads as nested.
 */
export const Mobile: Story = {
  args: GithubWorkflow.args,
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
