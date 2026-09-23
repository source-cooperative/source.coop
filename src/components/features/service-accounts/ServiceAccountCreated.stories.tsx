import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ServiceAccountCreated } from "./ServiceAccountCreated";

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

const step = [
  "# In the job, with permissions: { id-token: write }",
  "env:",
  "  AWS_ENDPOINT_URL_S3: https://data.source.coop",
  "steps:",
  "  - name: Sign in to Source Cooperative as nightly-sync",
  "    uses: aws-actions/configure-aws-credentials@v6",
  "    with:",
  "      role-to-assume: arn:aws:iam::nightly-sync:role/FullAccess",
  "      audience: https://data.source.coop",
  "      sts-endpoint: https://data.source.coop/.sts",
  "      aws-region: us-west-2",
].join("\n");

export const WithWorkflows: Story = {
  args: {
    ownerAccountId: "miskatonic",
    created: {
      account_id: "nightly-sync",
      name: "Nightly Sync",
      trusts: [{ subject: "repo:miskatonic/climate-data:ref:refs/heads/main", workflow_step: step }],
    },
  },
};

/** Created without naming a workflow: nothing to run, and a nudge to the list. */
export const NoWorkflows: Story = {
  args: {
    ownerAccountId: "miskatonic",
    created: { account_id: "nightly-sync", name: "Nightly Sync", trusts: [] },
  },
};
