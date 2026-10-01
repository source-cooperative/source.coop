import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UsageExamples } from "./UsageExamples";

/**
 * How software signs in as a service account, under Usage on the account's
 * page. One tab holds the step a trusted GitHub workflow adds; the other, the
 * variables that point any AWS SDK or the AWS CLI at an API key saved to a
 * file. Each names the account in the role ARN and points at the data proxy;
 * nothing in either is secret, so the same lines serve every workflow and
 * every key. The copy button takes the whole block.
 */
const meta = {
  title: "Features/Service accounts/UsageExamples",
  component: UsageExamples,
  parameters: { layout: "padded" },
  args: { accountId: "miskatonic--nightly-sync", proxyOrigin: "https://data.source.coop" },
} satisfies Meta<typeof UsageExamples>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** At phone width the blocks scroll sideways rather than wrap the YAML. */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile1" } },
};
