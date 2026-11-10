import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AccountFlagsForm } from "./AccountFlagsForm";
import {
  type Account,
  AccountFlags,
  AccountType,
  type UserSession,
} from "@/types";

/**
 * The capabilities an admin grants an account on its Permissions page. Each
 * checkbox turns on one part of the platform for that account: creating
 * products, organizations or data connections.
 *
 * An organization is offered only the capability an organization can use —
 * data connections. Only an admin may change the boxes;
 * anyone else who can see the page sees them read-only.
 *
 * `updateAccountFlags` is an `fn()` stub, so saving does nothing.
 */
const meta = {
  title: "Features/Settings/Permissions/AccountFlagsForm",
  component: AccountFlagsForm,
  parameters: { layout: "padded" },
} satisfies Meta<typeof AccountFlagsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const account = (
  account_id: string,
  name: string,
  type: AccountType,
  flags: AccountFlags[]
) =>
  ({
    account_id,
    name,
    type,
    flags,
    disabled: false,
    created_at: "2026-03-12T00:00:00Z",
    updated_at: "2026-03-12T00:00:00Z",
  }) as unknown as Account;

const session = (flags: AccountFlags[]) =>
  ({
    identity_id: "identity-1",
    account: account("acoltrane", "Alice Coltrane", AccountType.INDIVIDUAL, flags),
    memberships: [],
  }) as unknown as UserSession;

const admin = session([AccountFlags.ADMIN]);

/** An admin editing a person's account, which has been allowed data connections. */
export const Individual: Story = {
  args: {
    session: admin,
    account: account("bilbo", "Bilbo Baggins", AccountType.INDIVIDUAL, [
      AccountFlags.CREATE_REPOSITORIES,
      AccountFlags.CREATE_DATA_CONNECTIONS,
    ]),
  },
};

/** An organization is offered only data connections. */
export const Organization: Story = {
  args: {
    session: admin,
    account: account("miskatonic", "Miskatonic University", AccountType.ORGANIZATION, [
      AccountFlags.CREATE_DATA_CONNECTIONS,
    ]),
  },
};

/** A person viewing their own permissions sees them but can't change them. */
export const ReadOnly: Story = {
  args: {
    session: session([AccountFlags.CREATE_DATA_CONNECTIONS]),
    account: account("acoltrane", "Alice Coltrane", AccountType.INDIVIDUAL, [
      AccountFlags.CREATE_DATA_CONNECTIONS,
    ]),
  },
};
