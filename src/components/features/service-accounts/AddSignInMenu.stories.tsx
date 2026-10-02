import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AddSignInMenu } from "./AddSignInMenu";

/**
 * "Add sign-in", in the corner of a service account's "Signs in with": one
 * button, the same as "Grant a product" beside "Can reach", opening a menu of
 * the two ways software signs in. "GitHub workflow" opens
 * `AddGithubTrustDialog`; "API key" opens `IssueApiKeyDialog`. The create
 * form and the account's page both use it.
 *
 * The actions are mocked in `.storybook/preview.tsx`, so both modals can be
 * filled in and submitted.
 */
const meta = {
  title: "Features/Service accounts/AddSignInMenu",
  component: AddSignInMenu,
  parameters: { layout: "centered", docs: { story: { inline: false, iframeHeight: 560 } } },
  args: { accountId: "miskatonic--nightly-sync" },
} satisfies Meta<typeof AddSignInMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On an account's page: each sign-in is saved to the account as it is added. */
export const Default: Story = {};

/**
 * On the create form, before the account exists: the modals hand back what
 * they collect for the form to submit, and the key modal says "Add key"
 * rather than issuing one. Once the form holds a key, "API key" is turned off.
 */
export const BeforeTheAccountExists: Story = {
  args: { accountId: undefined, onAdd: () => {} },
};

/** The create form once it holds its one key. */
export const KeyAlreadyAdded: Story = {
  args: { accountId: undefined, onAdd: () => {}, keyDisabled: true },
};
