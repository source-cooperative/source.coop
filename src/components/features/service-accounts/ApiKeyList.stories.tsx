import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ApiKeyList } from "./ApiKeyList";
import type { ServiceAccountKey } from "@/types";

/**
 * A service account's API keys, as its page lists them. Each row gives the
 * key's label and its last six characters (`sck_…Xy9QeT`), which are its
 * checksum — enough to match a key in someone's environment to its record —
 * and, to the right, how it has been used and when it ends. A revoked key
 * says who revoked it: the person who did so in settings, someone anonymous
 * presenting the key to the revocation API, or GitHub secret scanning on
 * finding it in public. Hover those two lines for the exact dates and who
 * issued the key. A live key's "⋯" menu opens its example usage — the
 * variables that point an AWS SDK at it — changes its expiry or revokes it;
 * an expired key's menu leaves out the example, and a revoked key has nothing
 * left to do.
 *
 * The actions are mocked in `.storybook/preview.tsx`. Dates here are set
 * relative to today, so the wording reads the same whenever the story is
 * opened.
 */
const meta = {
  title: "Features/Settings/Service accounts/Detail/ApiKeyList",
  component: ApiKeyList,
  parameters: { layout: "padded", docs: { story: { inline: false, iframeHeight: 560 } } },
  args: { accountId: "miskatonic--nightly-sync", proxyOrigin: "https://data.source.coop" },
} satisfies Meta<typeof ApiKeyList>;

export default meta;
type Story = StoryObj<typeof meta>;

const DAY = 86_400_000;
const at = (days: number) => new Date(Date.now() + days * DAY).toISOString();

const key = (overrides: Partial<ServiceAccountKey>): ServiceAccountKey => ({
  key_id: "6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b",
  account_id: "miskatonic--nightly-sync",
  label: "HPC cron job",
  hint: "Xy9QeT",
  created_at: at(-200),
  created_by: "acoltrane",
  expires_at: at(160),
  ...overrides,
});

/** Every state a key can be in, one of each. */
export const Default: Story = {
  args: {
    keys: [
      key({ key_id: "k1", label: "HPC cron job", hint: "Xy9QeT", last_used_at: at(-3) }),
      key({ key_id: "k2", label: "Instrument uploader", hint: "m2RdK7", expires_at: null, last_used_at: at(0) }),
      key({ key_id: "k3", label: "Laptop, for testing", hint: "Q8vz0a", created_at: at(-1), expires_at: at(30) }),
      key({ key_id: "k4", label: "Last year's sync", hint: "t0pAw3", created_at: at(-400), expires_at: at(-35), last_used_at: at(-40) }),
      key({ key_id: "k5", label: "Old laptop", hint: "a07kT2", created_at: at(-300), expires_at: null, revoked_at: at(-270), revoked_via: "owner", revoked_by: "acoltrane" }),
      key({ key_id: "k7", label: "Shared in a notebook", hint: "pR3mVd", created_at: at(-60), expires_at: null, last_used_at: at(-12), revoked_at: at(-10), revoked_via: "holder" }),
      key({ key_id: "k6", label: "Notebook demo", hint: "Hq4sLw", created_at: at(-20), expires_at: at(70), last_used_at: at(-6), revoked_at: at(-5), revoked_via: "github" }),
    ],
  },
};

/**
 * A key issued before keys kept a hint of their last characters: listed
 * without one, rather than with an empty one.
 */
export const WithoutHint: Story = {
  args: { keys: [key({ hint: undefined, last_used_at: at(-12) })] },
};

/** No keys yet. */
export const Empty: Story = {
  args: { keys: [] },
};
