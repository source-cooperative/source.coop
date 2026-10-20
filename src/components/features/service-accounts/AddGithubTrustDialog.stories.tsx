import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { AddGithubTrustDialog } from "./AddGithubTrustDialog";

/**
 * Trusting a GitHub workflow, opened from "Add sign-in" → "GitHub workflow":
 * one repository, pinned to a branch, a tag or an environment, with the exact
 * condition that will be trusted shown beneath as you type.
 *
 * `addGithubTrust` is mocked in `.storybook/preview.tsx` to succeed, so
 * submitting closes the modal as it does in the app — here, by calling
 * `onOpenChange`, which does nothing.
 */
const meta = {
  title: "Features/Settings/Service accounts/Sign-in methods/AddGithubTrustDialog",
  component: AddGithubTrustDialog,
  // Each story opens a modal; on the docs page it gets a frame of its own, so
  // the modal stays inside its preview instead of covering the page.
  parameters: {
    layout: "padded",
    docs: { story: { inline: false, iframeHeight: 560 } },
  },
  args: {
    accountId: "miskatonic--nightly-sync",
    proxyOrigin: "https://data.source.coop",
    open: true,
    onOpenChange: fn(),
  },
} satisfies Meta<typeof AddGithubTrustDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
