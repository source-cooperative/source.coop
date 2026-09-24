import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ServiceAccountDetail } from "./ServiceAccountDetail";
import {
  AccountType,
  GITHUB_ACTIONS_ISSUER,
  MembershipRole,
  MembershipState,
  type ServiceAccountSummary,
} from "@/types";

/**
 * One service account's page, reached from its row in the owner's list and
 * where creating one lands. It shows the workflows the account trusts, each
 * with an "Example usage" modal holding the step the workflow adds, and a
 * dialog to trust another; the products it reaches, each opening the
 * product in a new tab, with its access changed or revoked in place and a
 * form to grant another of the owner's products; and, set apart in a danger
 * zone, disabling and deleting it.
 *
 * The actions are mocked in `.storybook/preview.tsx`.
 */
const meta = {
  title: "Features/Service accounts/ServiceAccountDetail",
  component: ServiceAccountDetail,
  parameters: { layout: "padded" },
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
};

export const Default: Story = { args: { summary } };

/** Disabled: marked beside the name, with Enable in place of Disable. */
export const Disabled: Story = {
  args: { summary: { ...summary, account: { ...account, disabled: true } } },
};

/** Just created with nothing named: it cannot sign in and reaches nothing. */
export const Empty: Story = {
  args: { summary: { account, trusts: [], grants: [] } },
};

/** Every product the owner has is granted, so there is nothing left to add. */
export const EverythingGranted: Story = {
  args: {
    summary,
    products: [
      { product_id: "climate-data", title: "Climate Data" },
      { product_id: "reference-data", title: "Reference Data" },
    ],
  },
};
