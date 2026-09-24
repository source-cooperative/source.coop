import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ServiceAccountCreated } from "./ServiceAccountCreated";
import { githubWorkflowStep } from "@/lib/services/github-workflow";

/**
 * The moment after creation. The account, its grants and the workflows it
 * trusts are saved; each workflow's step is shown so it can be pasted now.
 */
const meta = {
  title: "Features/Service accounts/ServiceAccountCreated",
  component: ServiceAccountCreated,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ServiceAccountCreated>;

export default meta;
type Story = StoryObj<typeof meta>;

const step = githubWorkflowStep("https://data.source.coop", "miskatonic--nightly-sync");

export const WithWorkflows: Story = {
  args: {
    ownerAccountId: "miskatonic",
    created: {
      account_id: "miskatonic--nightly-sync",
      name: "Nightly Sync",
      trusts: [{ subject: "repo:miskatonic/climate-data:ref:refs/heads/main", workflow_step: step }],
    },
  },
};

/** Created without naming a workflow: nothing to run, and a nudge to the list. */
export const NoWorkflows: Story = {
  args: {
    ownerAccountId: "miskatonic",
    created: { account_id: "miskatonic--nightly-sync", name: "Nightly Sync", trusts: [] },
  },
};
