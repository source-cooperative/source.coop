import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ApiKeyList } from "./ApiKeyList";
import type { ServiceAccountKey } from "@/types";

/**
 * A service account's API keys, as its page lists them. Each row gives the
 * key's label and its last four characters (`sck_…Xy9Q`) — enough to match a
 * key in someone's environment to its record — and, to the right, how it has
 * been used and when it ends. Hover those two lines for the exact dates and
 * who issued the key. A live key's "⋯" menu changes its expiry or revokes it;
 * a revoked key has nothing left to do.
 *
 * The actions are mocked in `.storybook/preview.tsx`. Dates here are set
 * relative to today, so the wording reads the same whenever the story is
 * opened.
 */
const meta = {
  title: "Features/Service accounts/ApiKeyList",
  component: ApiKeyList,
  parameters: { layout: "padded" },
  args: { accountId: "miskatonic--nightly-sync" },
} satisfies Meta<typeof ApiKeyList>;

export default meta;
type Story = StoryObj<typeof meta>;

const DAY = 86_400_000;
const at = (days: number) => new Date(Date.now() + days * DAY).toISOString();

const key = (overrides: Partial<ServiceAccountKey>): ServiceAccountKey => ({
  key_id: "6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b",
  account_id: "miskatonic--nightly-sync",
  label: "HPC cron job",
  hint: "Xy9Q",
  created_at: at(-200),
  created_by: "acoltrane",
  expires_at: at(160),
  ...overrides,
});

/** Every state a key can be in, one of each. */
export const Default: Story = {
  args: {
    keys: [
      key({ key_id: "k1", label: "HPC cron job", hint: "Xy9Q", last_used_at: at(-3) }),
      key({ key_id: "k2", label: "Instrument uploader", hint: "m2Rd", expires_at: null, last_used_at: at(0) }),
      key({ key_id: "k3", label: "Laptop, for testing", hint: "Q8_z", created_at: at(-1), expires_at: at(30) }),
      key({ key_id: "k4", label: "Last year's sync", hint: "t0pA", created_at: at(-400), expires_at: at(-35), last_used_at: at(-40) }),
      key({ key_id: "k5", label: "Old laptop", hint: "a_7k", created_at: at(-300), expires_at: null, revoked_at: at(-270) }),
    ],
  },
};

/** One live key: the usual case. */
export const Single: Story = {
  args: { keys: [key({ last_used_at: at(-3) })] },
};

/**
 * A key issued before keys kept their last four characters: listed without a
 * hint, rather than with an empty one.
 */
export const WithoutHint: Story = {
  args: { keys: [key({ hint: undefined, last_used_at: at(-12) })] },
};

/** No keys yet. */
export const Empty: Story = {
  args: { keys: [] },
};
