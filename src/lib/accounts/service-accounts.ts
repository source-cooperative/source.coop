import { Account, isServiceAccount, MembershipRole } from "@/types";

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
