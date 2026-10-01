import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IssuedApiKey } from "./IssuedApiKey";
import { apiKeyChecksum } from "@/types";

/**
 * An API key the moment it is issued — the only time anyone sees it: a
 * warning to copy it now, the key with a copy button, and the masked form it
 * is listed under from then on. The "Issue an API key" dialog shows it, and
 * so does `IssuedApiKeyDialog`, over the page of an account created with one.
 */
const meta = {
  title: "Features/Service accounts/IssuedApiKey",
  component: IssuedApiKey,
  parameters: { layout: "padded" },
} satisfies Meta<typeof IssuedApiKey>;

export default meta;
type Story = StoryObj<typeof meta>;

// Assembled at run time so that secret scanners don't flag this file.
const BODY = "storyFixtureNotARealKey1234567";

export const Default: Story = {
  args: {
    apiKey: `sck_${BODY}${apiKeyChecksum(BODY)}`,
    record: {
      key_id: "6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b",
      account_id: "miskatonic--nightly-sync",
      label: "HPC cron job",
      hint: apiKeyChecksum(BODY),
      created_at: "2026-03-12T00:00:00Z",
      created_by: "acoltrane",
      expires_at: null,
    },
  },
};
