import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Code } from "@radix-ui/themes";
import { ExampleUsage } from "./ExampleUsage";
import { apiKeyEnvironment, githubWorkflow } from "@/lib/services/service-account-usage";

/**
 * What software adds to sign in as a service account, ready to paste, opened
 * from "Example usage" in the menu on each way it signs in. For a trusted
 * GitHub workflow it is a whole workflow file; for a working API key, the
 * variables that point any AWS SDK or the AWS CLI at the key saved to a file.
 * Each names the account in the role ARN and points at the data proxy;
 * nothing in either is secret. Keys, values and comments are coloured, and
 * the copy button in the block's corner takes all of it.
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

export const GithubWorkflow: Story = {
  args: {
    title: "Sign in from this workflow",
    intro: (
      <>
        Save under <Code>.github/workflows/</Code> in the repository{" "}
        <Code>repo:miskatonic/climate-data:ref:refs/heads/main</Code> names:
      </>
    ),
    code: githubWorkflow(
      "https://data.source.coop",
      "miskatonic--nightly-sync",
      "repo:miskatonic/climate-data:ref:refs/heads/main"
    ),
    language: "yaml",
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
    intro: (
      <>
        Save under <Code>.github/workflows/</Code> in the repository{" "}
        <Code>repo:miskatonic@8123456/climate-data@9456789:environment:production</Code> names:
      </>
    ),
    code: githubWorkflow(
      "https://data.source.coop",
      "miskatonic--nightly-sync",
      "repo:miskatonic@8123456/climate-data@9456789:environment:production"
    ),
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
