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
 * An owner's service accounts. Each card says who the account is, which
 * workflows it trusts to act as it, what it can reach, and carries the
 * controls: trust another workflow, remove a trust, disable, delete.
 *
 * The lifecycle actions are mocked in `.storybook/preview.tsx`; "Trust a
 * GitHub workflow" opens the dialog and its submit shows the workflow step.
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
      summary("nightly-sync", "Nightly Sync"),
      summary("archive-mirror", "Archive Mirror", {
        trusts: [],
        grants: [],
      }),
    ],
  },
};

/** A disabled account keeps its trusts and grants; only sign-in stops. */
export const Disabled: Story = {
  args: {
    summaries: [
      {
        ...summary("nightly-sync", "Nightly Sync"),
        account: { ...summary("nightly-sync", "Nightly Sync").account, disabled: true },
      },
    ],
  },
};

export const Empty: Story = {
  args: { summaries: [] },
};
