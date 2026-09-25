import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IssueApiKeyDialog } from "./IssueApiKeyDialog";

/**
 * Issuing an API key: a label and an expiry, then the key — shown once, with
 * the copy affordance and the warning that says so.
 *
 * `issueApiKey` is mocked in `.storybook/preview.tsx` and resolves with a key
 * of the real shape, `sck_` and 43 characters of nothing secret, so
 * **submitting the form shows the show-once view**. Open the dialog, give it
 * a label, and issue.
 */
const meta = {
  title: "Features/Service accounts/IssueApiKeyDialog",
  component: IssueApiKeyDialog,
  parameters: { layout: "padded" },
} satisfies Meta<typeof IssueApiKeyDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { accountId: "miskatonic--nightly-sync" },
};
