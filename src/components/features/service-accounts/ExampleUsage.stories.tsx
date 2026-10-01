import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Code } from "@radix-ui/themes";
import { ExampleUsage } from "./ExampleUsage";
import { apiKeyEnvironment, githubWorkflowStep } from "@/lib/services/service-account-usage";

/**
 * The "Example usage" link on each way a service account signs in, opening
 * what software adds to use it, ready to paste. On a trusted GitHub workflow's
 * row it is the step the job adds; on a live API key's row, the variables that
 * point any AWS SDK or the AWS CLI at the key saved to a file. Each names the
 * account in the role ARN and points at the data proxy; nothing in either is
 * secret. The copy button takes the whole block.
 */
const meta = {
  title: "Features/Service accounts/ExampleUsage",
  component: ExampleUsage,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ExampleUsage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GithubWorkflow: Story = {
  args: {
    title: "Sign in from this workflow",
    intro: (
      <>
        Add to the job in <Code>repo:miskatonic/climate-data:ref:refs/heads/main</Code>, before it
        uses the data:
      </>
    ),
    code: githubWorkflowStep("https://data.source.coop", "miskatonic--nightly-sync"),
  },
};

export const ApiKey: Story = {
  args: {
    title: "Sign in with HPC cron job",
    intro: "Save the key to a file, then point any AWS SDK or the AWS CLI at it:",
    code: apiKeyEnvironment("https://data.source.coop", "miskatonic--nightly-sync"),
  },
};
