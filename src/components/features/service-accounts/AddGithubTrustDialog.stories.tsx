import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { AddGithubTrustDialog } from "./AddGithubTrustDialog";

/**
 * Trusting a GitHub workflow, opened from "Add sign-in" → "GitHub workflow":
 * one repository, pinned to a ref or an environment, with the exact subject
 * that will be trusted shown beneath as you type.
 *
 * `addGithubTrust` is mocked in `.storybook/preview.tsx` to succeed, so
 * submitting closes the modal as it does in the app — here, by calling
 * `onOpenChange`, which does nothing.
 */
const meta = {
  title: "Features/Service accounts/AddGithubTrustDialog",
  component: AddGithubTrustDialog,
  parameters: { layout: "padded" },
  args: { accountId: "miskatonic--nightly-sync", open: true, onOpenChange: fn() },
} satisfies Meta<typeof AddGithubTrustDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
