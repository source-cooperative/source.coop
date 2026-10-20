import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { IssuedApiKey } from "./IssuedApiKey";
import { apiKeyChecksum } from "@/types";

/**
 * An API key the moment it is issued — the only time anyone sees it: a
 * warning to copy it now, and the key with buttons to copy it and to show it.
 * The key starts masked, in the form it is listed under from then on, so a
 * shared screen doesn't leak it; copying always copies the whole key. The
 * "Issue an API key" dialog shows it, and so does the page of an account
 * created with one (`ServiceAccountDetail`'s "Created with a key").
 */
const meta = {
  title: "Features/Settings/Service accounts/Sign-in methods/IssuedApiKey",
  component: IssuedApiKey,
  parameters: { layout: "padded" },
} satisfies Meta<typeof IssuedApiKey>;

export default meta;
type Story = StoryObj<typeof meta>;

// Assembled at run time so that secret scanners don't flag this file.
const BODY = "storyFixtureNotARealKey1234567";

const KEY = `sck_${BODY}${apiKeyChecksum(BODY)}`;

/** As issued: masked until someone asks to see it. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText(KEY)).not.toBeInTheDocument();
  },
  args: {
    apiKey: KEY,
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
