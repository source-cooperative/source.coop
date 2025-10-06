import { Box, Text, Table, Flex } from "@radix-ui/themes";
import { PersonIcon } from "@radix-ui/react-icons";
import { Membership, Account } from "@/types";
import {
  InlineRoleSelector,
  InlineStateSelector,
  AvatarLinkCompact,
} from "@/components";

interface MembershipsTableProps {
  memberships: Membership[];
  memberAccountsMap: Map<string, Account>;
  canRevokeMembership: (membership: Membership) => boolean;
  emptyStateMessage: string;
  emptyStateDescription: string;
}

export function MembershipsTable({
  memberships,
  memberAccountsMap,
  canRevokeMembership,
  emptyStateMessage,
  emptyStateDescription,
}: MembershipsTableProps) {
  if (memberships.length === 0) {
    return (
      <Flex
        direction="column"
        align="center"
        gap="2"
        py="8"
        style={{ userSelect: "none" }}
      >
        <PersonIcon width="48" height="48" color="var(--gray-8)" />
        <Text size="4" weight="medium" color="gray">
          {emptyStateMessage}
        </Text>
        <Text size="2" color="gray">
          {emptyStateDescription}
        </Text>
      </Flex>
    );
  }

  return (
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
        {memberships.map((membership) => {
          const memberAccount = memberAccountsMap.get(membership.account_id);
          return (
            <Table.Row key={membership.membership_id}>
              <Table.Cell>
                <AvatarLinkCompact account={memberAccount!} size="1" />
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
  );
}
