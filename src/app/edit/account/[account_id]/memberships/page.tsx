import { Box, Text, Table, Badge, Button, Flex } from "@radix-ui/themes";
import { PersonIcon, PlusIcon } from "@radix-ui/react-icons";
import { MembershipRole, MembershipState } from "@/types";
import { accountsTable, membershipsTable } from "@/lib/clients/database";
import { FormTitle } from "@/components";

interface MembershipsPageProps {
  params: Promise<{ account_id: string }>;
}

export default async function MembershipsPage({
  params,
}: MembershipsPageProps) {
  const { account_id } = await params;
  const memberships = await membershipsTable.listByAccount(account_id);
  const activeMemberships = memberships.filter(
    (membership) => membership.state === MembershipState.Member
  );

  // Get account details for each membership
  const memberAccountIds = activeMemberships.map((m) => m.account_id);
  const memberAccounts = await accountsTable.fetchManyByIds(memberAccountIds);
  const memberAccountsMap = new Map(
    memberAccounts.map((acc) => [acc.account_id, acc])
  );

  const getRoleBadgeColor = (role: MembershipRole) => {
    switch (role) {
      case MembershipRole.Owners:
        return "red";
      case MembershipRole.Maintainers:
        return "blue";
      case MembershipRole.WriteData:
        return "green";
      case MembershipRole.ReadData:
        return "gray";
      default:
        return "gray";
    }
  };

  const getRoleDisplayName = (role: MembershipRole) => {
    switch (role) {
      case MembershipRole.Owners:
        return "Owner";
      case MembershipRole.Maintainers:
        return "Maintainer";
      case MembershipRole.WriteData:
        return "Writer";
      case MembershipRole.ReadData:
        return "Reader";
      default:
        return role;
    }
  };

  return (
    <Box>
      <Flex justify="between" align="center" mb="6">
        <Box>
          <FormTitle
            title="Memberships"
            description="Manage organization members and their roles"
          />
        </Box>
        <Button size="2">
          <PlusIcon width="16" height="16" />
          Invite Member
        </Button>
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
              <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Joined</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="100px">
                Actions
              </Table.ColumnHeaderCell>
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
                    <Flex align="center" gap="3">
                      <Box
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          backgroundColor: "var(--gray-4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <PersonIcon
                          width="16"
                          height="16"
                          color="var(--gray-9)"
                        />
                      </Box>
                      <Box>
                        <Text size="2" weight="medium">
                          {memberAccount?.name || "Unknown User"}
                        </Text>
                        <Text size="1" color="gray">
                          @{memberAccount?.account_id || membership.account_id}
                        </Text>
                      </Box>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={getRoleBadgeColor(membership.role)}>
                      {getRoleDisplayName(membership.role)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {new Date(membership.state_changed).toLocaleDateString()}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Button size="1" variant="soft" color="red">
                      Remove
                    </Button>
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
