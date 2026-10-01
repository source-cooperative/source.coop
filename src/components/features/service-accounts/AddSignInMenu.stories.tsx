import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AddSignInMenu } from "./AddSignInMenu";

/**
 * "Add sign-in", in the corner of a service account's "Signs in with": one
 * button, the same as "Grant a product" beside "Can reach", opening a menu of
 * the two ways software signs in. "GitHub workflow" opens
 * `AddGithubTrustDialog`; "API key" opens `IssueApiKeyDialog`.
 *
 * The actions are mocked in `.storybook/preview.tsx`, so both modals can be
 * filled in and submitted.
 */
const meta = {
  title: "Features/Service accounts/AddSignInMenu",
  component: AddSignInMenu,
  parameters: { layout: "centered" },
  args: { accountId: "miskatonic--nightly-sync" },
} satisfies Meta<typeof AddSignInMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
