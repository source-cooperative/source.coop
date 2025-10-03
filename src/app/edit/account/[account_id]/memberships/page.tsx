import { Box, Text, Table, Flex } from "@radix-ui/themes";
import { PersonIcon } from "@radix-ui/react-icons";
import { Actions, Membership, MembershipRole, MembershipState } from "@/types";
import {
  accountsTable,
  isOrganizationalAccount,
  membershipsTable,
} from "@/lib/clients/database";
import {
  FormTitle,
  InviteMemberForm,
  InlineRoleSelector,
  InlineStateSelector,
  AvatarLinkCompact,
} from "@/components";
import { notFound, redirect } from "next/navigation";
import { getPageSession } from "@/lib";
import { isAuthorized } from "@/lib/api/authz";
import { editAccountProfileUrl } from "@/lib/urls";

interface MembershipsPageProps {
  params: Promise<{ account_id: string }>;
}

export default async function MembershipsPage({
  params,
}: MembershipsPageProps) {
  const { account_id } = await params;
  const account = await accountsTable.fetchById(account_id);
  if (!account) {
    notFound();
  }

  if (!isOrganizationalAccount(account)) {
    redirect(editAccountProfileUrl(account_id));
  }

  const userSession = await getPageSession();
  if (!isAuthorized(userSession, account, Actions.ListAccountMemberships)) {
    redirect(editAccountProfileUrl(account_id));
  }

  const memberships = await membershipsTable.listByAccount(account_id);
  const activeMemberships = memberships
    .filter((membership) => membership.state === MembershipState.Member)
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
  const canRevokeMembership = (membership: Membership) =>
    isAuthorized(userSession, membership, Actions.RevokeMembership);

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

      {activeMemberships.length === 0 ? (
        <Box
          style={{
            textAlign: "center",
            padding: "48px 24px",
            border: "1px dashed var(--gray-6)",
            borderRadius: "8px",
            backgroundColor: "var(--gray-2)",
          }}
        >
          <PersonIcon width="48" height="48" color="var(--gray-8)" />
          <Text size="4" weight="medium" color="gray" mt="3" mb="2">
            No members yet
          </Text>
          <Text size="2" color="gray">
            Invite people to join your organization
          </Text>
        </Box>
      ) : (
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Member</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Joined</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {activeMemberships.map((membership) => {
              const memberAccount = memberAccountsMap.get(
                membership.account_id
              );
              return (
                <Table.Row key={membership.membership_id}>
                  <Table.Cell>
                    <AvatarLinkCompact account={memberAccount!} />
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {new Date(membership.state_changed).toLocaleDateString()}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <InlineRoleSelector
                      membership={membership}
                      disabled={!canRevokeMembership(membership)}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <InlineStateSelector
                      membership={membership}
                      disabled={!canRevokeMembership(membership)}
                    />
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      )}
    </Box>
  );
}
