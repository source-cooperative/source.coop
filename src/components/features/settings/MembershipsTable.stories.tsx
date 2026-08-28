import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MembershipsTable } from "./MembershipsTable";
import {
  type Account,
  type Membership,
  MembershipRole,
  MembershipState,
  type UserSession,
} from "@/types";

/**
 * An organization's members, sorted so invitations surface above members and
 * revoked accounts sink.
 *
 * The sort is the part worth seeing: the rows below are deliberately supplied
 * out of order, so if the ordering rule breaks, this story shows it.
 *
 * `revokeMembership` is an `fn()` stub, so the row actions do nothing.
 */
const meta = {
  title: "Settings/MembershipsTable",
  component: MembershipsTable,
  parameters: { layout: "padded" },
} satisfies Meta<typeof MembershipsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const account = (account_id: string, name: string) =>
  ({ account_id, name, type: "individual" }) as unknown as Account;

const membership = (
  account_id: string,
  role: MembershipRole,
  state: MembershipState
) =>
  ({
    membership_id: `m-${account_id}`,
    account_id,
    membership_account_id: "cascadia-research",
    role,
    state,
    state_changed: "2026-03-12T00:00:00Z",
  }) as unknown as Membership;

// Supplied revoked-first on purpose; the component is what should reorder it.
const memberships = [
  membership("bilbo", MembershipRole.ReadData, MembershipState.Revoked),
  membership("cholmes", MembershipRole.Owners, MembershipState.Member),
  membership("newcomer", MembershipRole.WriteData, MembershipState.Invited),
];

const memberAccountsMap = new Map([
  ["cholmes", account("cholmes", "Chris Holmes")],
  ["newcomer", account("newcomer", "Sam Rivera")],
  ["bilbo", account("bilbo", "Bilbo Baggins")],
]);

const userSession = {
  identity_id: "identity-1",
  account: account("cholmes", "Chris Holmes"),
} as unknown as UserSession;

const base = {
  memberships,
  memberAccountsMap,
  userSession,
  emptyStateMessage: "No members yet",
  emptyStateDescription: "Invite someone to get started.",
};

export const Default: Story = {
  args: { ...base, editable: true },
};

/** Without management rights the roles and controls are read-only. */
export const NotEditable: Story = {
  args: { ...base, editable: false },
};

export const Empty: Story = {
  args: { ...base, memberships: [], editable: true },
};
