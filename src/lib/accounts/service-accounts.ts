import {
  Account,
  isServiceAccount,
  MembershipRole,
  type ServiceAccount,
  type UserSession,
} from "@/types";
import { canManageServiceAccount } from "@/lib/api/authz";
import { accountsTable } from "@/lib/clients";

const SERVICE_ACCOUNT_ROLES = [MembershipRole.ReadData, MembershipRole.WriteData];

/**
 * Why `account` may not hold `role` on `target`, or null if it may. Only a
 * service account is constrained: it reads or writes products its owner
 * holds, and nothing else. Every other account passes.
 */
export function serviceAccountGrantProblem(
  account: Account,
  target: { membership_account_id: string; repository_id?: string },
  role: MembershipRole
): string | null {
  if (!isServiceAccount(account)) {
    return null;
  }
  if (!SERVICE_ACCOUNT_ROLES.includes(role)) {
    return "A service account can only be granted read_data or write_data";
  }
  if (
    target.membership_account_id !== account.owner_account_id ||
    !target.repository_id
  ) {
    return "A service account can only be granted access to products owned by its owner";
  }
  return null;
}

/**
 * The service account `account_id` names, if `session` may manage it —
 * otherwise null, whether it is missing, not a service account, someone
 * else's, or owned by an account that has been disabled. One answer for every
 * action that changes a service account.
 */
export async function managedServiceAccount(
  session: UserSession | null,
  account_id: string
): Promise<ServiceAccount | null> {
  if (!session?.account) return null;
  const account = await accountsTable.fetchById(account_id);
  if (!account || !isServiceAccount(account)) return null;
  const owner = await accountsTable.fetchById(account.owner_account_id);
  if (!owner || !canManageServiceAccount(session, account, owner)) return null;
  return account;
}
