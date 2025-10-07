import { Box, Flex } from "@radix-ui/themes";
import { Actions, Membership, MembershipRole, MembershipState } from "@/types";
import {
  accountsTable,
  isOrganizationalAccount,
  membershipsTable,
} from "@/lib/clients/database";
import { FormTitle, InviteMemberForm, MembershipsTable } from "@/components";
import { notFound, redirect } from "next/navigation";
import { getPageSession } from "@/lib";
import { isAuthorized } from "@/lib/api/authz";
import { editAccountProfileUrl } from "@/lib/urls";

export async function generateMetadata({ params }: PageProps) {
  const { account_id } = await params;
  const account = await accountsTable.fetchById(account_id);
  return { title: `Edit ${account!.name} memberships` };
}

interface PageProps {
  params: Promise<{ account_id: string }>;
}

export default async function MembershipsPage({ params }: PageProps) {
  const { account_id } = await params;
  const account = await accountsTable.fetchById(account_id);
  const userSession = await getPageSession();
  if (!account || !userSession) {
    notFound();
  }

  if (!isOrganizationalAccount(account)) {
    redirect(editAccountProfileUrl(account_id));
  }

  if (!isAuthorized(userSession, account, Actions.ListAccountMemberships)) {
    redirect(editAccountProfileUrl(account_id));
  }

  const memberships = await membershipsTable.listByAccount(account_id);
  const activeMemberships = memberships
    .filter(
      (membership) => !membership.repository_id // Only show organization-level memberships, not repository-specific ones
    )
    .sort((a, b) => {
      // Define role hierarchy: Owners > Maintainers > Writers > Readers
      const roleOrder = {
        [MembershipRole.Owners]: 0,
        [MembershipRole.Maintainers]: 1,
        [MembershipRole.WriteData]: 2,
        [MembershipRole.ReadData]: 3,
      };

      return roleOrder[a.role] - roleOrder[b.role];
    });

  // Get account details for each membership
  const memberAccountIds = activeMemberships.map((m) => m.account_id);
  const memberAccounts = await accountsTable.fetchManyByIds(memberAccountIds);
  const memberAccountsMap = new Map(
    memberAccounts.map((acc) => [acc.account_id, acc])
  );

  const canInviteMembership = isAuthorized(
    userSession,
    account,
    Actions.InviteMembership
  );

  return (
    <Box>
      <Flex justify="between" align="center" mb="6">
        <Box>
          <FormTitle
            title="Memberships"
            description="Manage organization members and their roles"
          />
        </Box>
        {canInviteMembership && <InviteMemberForm organization={account} />}
      </Flex>

      <MembershipsTable
        memberships={activeMemberships}
        memberAccountsMap={memberAccountsMap}
        userSession={userSession}
        emptyStateMessage="No members yet"
        emptyStateDescription="Invite people to join your organization"
      />
    </Box>
  );
}
