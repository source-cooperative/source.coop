import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ServiceAccountList } from "./ServiceAccountList";
import {
  AccountType,
  GITHUB_ACTIONS_ISSUER,
  MembershipRole,
  MembershipState,
  type ServiceAccountSummary,
} from "@/types";

/**
 * An owner's service accounts, one row each, in the same bordered list the
 * data connections use: the name linking to the account's own page, its id,
 * a marker when it is disabled, and how many workflows it trusts and products
 * it reaches. The controls live on that page, `ServiceAccountDetail`.
 */
const meta = {
  title: "Features/Service accounts/ServiceAccountList",
  component: ServiceAccountList,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ServiceAccountList>;

export default meta;
type Story = StoryObj<typeof meta>;

const summary = (
  account_id: string,
  name: string,
  overrides: Partial<ServiceAccountSummary> = {}
): ServiceAccountSummary => ({
  account: {
    account_id,
    name,
    type: AccountType.SERVICE,
    owner_account_id: "miskatonic",
    disabled: false,
    flags: [],
    created_at: "2026-03-12T00:00:00Z",
    updated_at: "2026-03-12T00:00:00Z",
    identity_id: undefined,
    metadata_public: {},
  },
  trusts: [
    {
      account_id,
      issuer: GITHUB_ACTIONS_ISSUER,
      subject: `repo:miskatonic/${account_id}:ref:refs/heads/main`,
      created_at: "2026-03-12T00:00:00Z",
      created_by: "acoltrane",
    },
  ],
  grants: [
    {
      membership_id: `m-${account_id}`,
      account_id,
      membership_account_id: "miskatonic",
      repository_id: "climate-data",
      role: MembershipRole.WriteData,
      state: MembershipState.Member,
      state_changed: "2026-03-12T00:00:00Z",
    },
  ],
  ...overrides,
});

export const Default: Story = {
  args: {
    summaries: [
      summary("miskatonic--nightly-sync", "Nightly Sync"),
      summary("miskatonic--archive-mirror", "Archive Mirror", {
        trusts: [],
        grants: [],
      }),
    ],
  },
};

/** A disabled account is marked on its row; its trusts and grants are kept. */
export const Disabled: Story = {
  args: {
    summaries: [
      {
        ...summary("miskatonic--nightly-sync", "Nightly Sync"),
        account: { ...summary("miskatonic--nightly-sync", "Nightly Sync").account, disabled: true },
      },
    ],
  },
};

export const Empty: Story = {
  args: { summaries: [] },
};
