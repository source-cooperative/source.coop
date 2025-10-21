import { Account, MembershipState, MembershipRole } from "@/types";
import { accountsTable, membershipsTable } from "./database";

/**
 * Returns a list of accounts that the user can manage.
 * @param account 
 * @returns 
 */
export async function getManageableAccounts(account: Account) {
  const memberships = await membershipsTable.listByUser(account.account_id);
  return [
    account,
    ...(await accountsTable.fetchManyByIds(
      memberships
        // Filter for active memberships
        .filter(({ state }) => state === MembershipState.Member)
        // Filter for owner or maintainer roles
        .filter(({ role }) =>
          [MembershipRole.Owners, MembershipRole.Maintainers].includes(role)
        )
        // Filter for organization-level memberships (not product-specific)
        .filter(({ repository_id }) => repository_id === undefined)
        // Get the account IDs
        .map((membership) => membership.membership_account_id)
    )),
  ];
}
