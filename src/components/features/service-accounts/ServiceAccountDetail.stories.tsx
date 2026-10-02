import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ServiceAccountDetail } from "./ServiceAccountDetail";
import { handOffIssuedKey } from "./IssuedApiKeyDialog";
import {
  AccountType,
  GITHUB_ACTIONS_ISSUER,
  MembershipRole,
  MembershipState,
  apiKeyChecksum,
  type ServiceAccountSummary,
} from "@/types";

/**
 * One service account's page, reached from its row in the owner's list and
 * where creating one lands. It opens with who it is: the name, edited in
 * place and saved with its own button, above the account id, which cannot
 * change because it is what software signs in as. Then how it signs in: the
 * workflows it trusts, then its API keys, marked once revoked or expired, each
 * revocable — with "Add sign-in" in the corner, a menu that opens a modal to
 * trust another workflow or issue a key. Each workflow's "⋯" menu, and each
 * working key's, has "Example usage", opening what software adds to sign in
 * that way. Then the products it reaches, each with Read / Read and write and
 * an X, and "Grant a product" in the corner, a modal to choose a product and
 * its access — the create form's list and button; and, set apart in a danger
 * zone, Disable and Delete, each confirmed in a modal that says what it does;
 * Delete waits for the account id to be typed.
 *
 * The actions are mocked in `.storybook/preview.tsx`. An access change shows
 * at once and the controls wait while it saves; the mock saves nothing, so
 * the choice then springs back where the app would keep it.
 */
const meta = {
  title: "Features/Service accounts/ServiceAccountDetail",
  component: ServiceAccountDetail,
  parameters: { layout: "padded", docs: { story: { inline: false, iframeHeight: 640 } } },
  args: {
    proxyOrigin: "https://data.source.coop",
    products: [
      { product_id: "climate-data", title: "Climate Data" },
      { product_id: "reference-data", title: "Reference Data" },
      { product_id: "field-notes", title: "Field Notes" },
    ],
  },
} satisfies Meta<typeof ServiceAccountDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

const account = {
  account_id: "miskatonic--nightly-sync",
  name: "Nightly Sync",
  type: AccountType.SERVICE,
  owner_account_id: "miskatonic",
  disabled: false,
  flags: [],
  created_at: "2026-03-12T00:00:00Z",
  updated_at: "2026-03-12T00:00:00Z",
  identity_id: undefined,
  metadata_public: {},
} as ServiceAccountSummary["account"];

const trust = (subject: string) => ({
  account_id: "miskatonic--nightly-sync",
  issuer: GITHUB_ACTIONS_ISSUER,
  subject,
  created_at: "2026-03-12T00:00:00Z",
  created_by: "acoltrane",
});

const grant = (repository_id: string, role: MembershipRole) => ({
  membership_id: `m-${repository_id}`,
  account_id: "miskatonic--nightly-sync",
  membership_account_id: "miskatonic",
  repository_id,
  role,
  state: MembershipState.Member,
  state_changed: "2026-03-12T00:00:00Z",
});

const summary: ServiceAccountSummary = {
  account,
  trusts: [
    trust("repo:miskatonic/climate-data:ref:refs/heads/main"),
    trust("repo:miskatonic@8123456/climate-data@9456789:environment:production"),
  ],
  grants: [
    grant("climate-data", MembershipRole.WriteData),
    grant("reference-data", MembershipRole.ReadData),
  ],
  keys: [
    {
      key_id: "k1",
      account_id: "nightly-sync",
      label: "HPC cron job",
      hint: "Xy9QeT",
      created_at: "2026-03-12T00:00:00Z",
      created_by: "acoltrane",
      expires_at: "2027-03-12T00:00:00Z",
      last_used_at: "2026-03-20T00:00:00Z",
    },
    {
      key_id: "k2",
      account_id: "nightly-sync",
      label: "Old laptop",
      hint: "a07kT2",
      created_at: "2025-03-12T00:00:00Z",
      created_by: "acoltrane",
      expires_at: null,
      revoked_at: "2026-01-01T00:00:00Z",
    },
  ],
};

export const Default: Story = { args: { summary } };

/** Disabled: marked beside the name, with Enable in place of Disable. */
export const Disabled: Story = {
  args: { summary: { ...summary, account: { ...account, disabled: true } } },
};

/** Signs in only with API keys: the workflows' list is left out. */
export const KeysOnly: Story = {
  args: { summary: { ...summary, trusts: [] } },
};

/** Just created with nothing named: it cannot sign in and reaches nothing. */
export const Empty: Story = {
  args: { summary: { account, trusts: [], grants: [], keys: [] } },
};

/**
 * Just created with an API key: the create form hands the key over and it
 * opens over the page, the one time it is shown.
 */
const justIssued = { ...summary.keys[0], last_used_at: undefined };
export const CreatedWithKey: Story = {
  args: { summary: { account, trusts: [], grants: [], keys: [justIssued] } },
  beforeEach: () => {
    // Assembled at run time so that secret scanners don't flag this file.
    const body = "storyFixtureNotARealKey1234567";
    handOffIssuedKey({
      key: `sck_${body}${apiKeyChecksum(body)}`,
      record: { ...justIssued, account_id: account.account_id, hint: apiKeyChecksum(body) },
    });
  },
};
