import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IssuedApiKeyDialog, handOffIssuedKey } from "./IssuedApiKeyDialog";
import { apiKeyChecksum } from "@/types";

/**
 * The API key issued with a new service account, open over the account's page
 * the moment the create form lands there — the only time the key is seen. The
 * form hands it over in memory, never through the URL or storage, so it shows
 * only on the page it was issued for, and closing it lets the key go.
 */
const meta = {
  title: "Features/Service accounts/IssuedApiKeyDialog",
  component: IssuedApiKeyDialog,
  // Each story opens a modal; on the docs page it gets a frame of its own, so
  // the modal stays inside its preview instead of covering the page.
  parameters: { layout: "padded", docs: { story: { inline: false, iframeHeight: 420 } } },
  args: { accountId: "miskatonic--nightly-sync" },
} satisfies Meta<typeof IssuedApiKeyDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Assembled at run time so that secret scanners don't flag this file.
const BODY = "storyFixtureNotARealKey1234567";

export const Default: Story = {
  beforeEach: () =>
    handOffIssuedKey({
      key: `sck_${BODY}${apiKeyChecksum(BODY)}`,
      record: {
        key_id: "6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b",
        account_id: "miskatonic--nightly-sync",
        label: "HPC cron job",
        hint: apiKeyChecksum(BODY),
        created_at: "2026-03-12T00:00:00Z",
        created_by: "acoltrane",
        expires_at: null,
      },
    }),
};

/** Nothing was handed off for this account, so nothing shows. */
export const NothingIssued: Story = {
  args: { accountId: "miskatonic--archive-mirror" },
};
