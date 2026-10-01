import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { IssueApiKeyDialog } from "./IssueApiKeyDialog";

/**
 * Issuing an API key, opened from "Add sign-in" → "API key": a label and an
 * expiry, then the key — shown once, with the copy affordance and the warning
 * that says so. How to use it lives on the key's row, under "Example usage" in
 * its menu (`ExampleUsage`). Closing it and opening it again starts a new key.
 *
 * `issueApiKey` is mocked in `.storybook/preview.tsx` and resolves with a key
 * of the real shape, `sck_` and 36 characters of nothing secret, so
 * **submitting the form shows the show-once view**. Give it a label, and issue.
 */
const meta = {
  title: "Features/Service accounts/IssueApiKeyDialog",
  component: IssueApiKeyDialog,
  // Each story opens a modal; on the docs page it gets a frame of its own, so
  // the modal stays inside its preview instead of covering the page.
  parameters: { layout: "padded", docs: { story: { inline: false, iframeHeight: 520 } } },
  args: { accountId: "miskatonic--nightly-sync", open: true, onOpenChange: fn() },
} satisfies Meta<typeof IssueApiKeyDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
