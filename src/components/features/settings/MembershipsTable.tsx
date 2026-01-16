"use client";

import { Text, Table, Flex, Button, Badge } from "@radix-ui/themes";
import { PersonIcon } from "@radix-ui/react-icons";
import {
  Membership,
  Account,
  MembershipRole,
  MembershipState,
  Actions,
  UserSession,
} from "@/types";
import { AvatarLinkCompact } from "@/components";
import { isAuthorized } from "@/lib/api/authz";
import { revokeMembership } from "@/lib/actions/memberships";
import Form from "next/form";
import { useActionState } from "react";

interface MembershipsTableProps {
  memberships: Membership[];
  memberAccountsMap: Map<string, Account>;
  userSession: UserSession;
  emptyStateMessage: string;
  emptyStateDescription: string;
  editable?: boolean;
}

export function MembershipsTable({
  memberships,
  memberAccountsMap,
  userSession,
  emptyStateMessage,
  emptyStateDescription,
  editable = true,
}: MembershipsTableProps) {
  // Helper function to check if user can revoke a membership
  const canRevokeMembership = (membership: Membership) =>
    isAuthorized(userSession, membership, Actions.RevokeMembership);

  // Use action state for form handling
  const [state, formAction, pending] = useActionState(revokeMembership, {
    message: "",
    data: new FormData(),
    fieldErrors: {},
    success: false,
  });

  // Sort memberships: invited first, then members, then revoked last
  const sortedMemberships = [...memberships].sort((a, b) => {
    // Define priority order: invited (0), member (1), revoked (2)
    const getPriority = (state: MembershipState) => {
      if (state === MembershipState.Invited) return 0;
      if (state === MembershipState.Member) return 1;
      if (state === MembershipState.Revoked) return 2;
      return 3; // fallback for unknown states
    };

    return getPriority(a.state) - getPriority(b.state);
  });

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
    <>
      {/* Hidden forms outside the table */}
      {editable && memberships.map((membership) => {
        const formId = `membership-form-${membership.membership_id}`;
        return (
          <Form
            key={formId}
            action={formAction}
            id={formId}
            style={{ display: "none" }}
          >
            <input
              type="hidden"
              name="membership_id"
              value={membership.membership_id}
            />
          </Form>
        );
      })}

      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Member</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
            {editable && <>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Last Updated</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
            </>}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {sortedMemberships.map((membership) => {
            const memberAccount = memberAccountsMap.get(membership.account_id);
            const formId = `membership-form-${membership.membership_id}`;
            return (
              <Table.Row key={membership.membership_id}>
                <Table.Cell>
                  <AvatarLinkCompact account={memberAccount!} size="1" />
                </Table.Cell>
                <Table.Cell>
                  <Badge
                    size="2"
                    // weight="medium"
                    color={
                      ({
                        [MembershipRole.Owners]: "gold",
                        [MembershipRole.Maintainers]: "blue",
                        [MembershipRole.WriteData]: "green",
                        [MembershipRole.ReadData]: "gray",
                      }[membership.role] || "gray") as React.ComponentProps<
                        typeof Text
                      >["color"]
                    }
                  >
                    {{
                      [MembershipRole.Owners]: "Owner",
                      [MembershipRole.Maintainers]: "Maintainer",
                      [MembershipRole.WriteData]: "Writer",
                      [MembershipRole.ReadData]: "Reader",
                    }[membership.role] || "Unknown"}
                  </Badge>
                </Table.Cell>
                {editable && <>
                  <Table.Cell>
                    <Text
                      size="2"
                      color={
                        ({
                          [MembershipState.Member]: "green",
                          [MembershipState.Invited]: "blue",
                          [MembershipState.Revoked]: "red",
                        }[membership.state] || "gray") as React.ComponentProps<
                          typeof Text
                        >["color"]
                      }
                    >
                      {{
                        [MembershipState.Member]: "Member",
                        [MembershipState.Invited]: "Invited",
                        [MembershipState.Revoked]: "Revoked",
                      }[membership.state] || "Unknown"}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {new Date(membership.state_changed).toLocaleDateString()}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      type="submit"
                      form={formId}
                      size="1"
                      variant="soft"
                      color="red"
                      disabled={
                        !canRevokeMembership(membership) ||
                        pending ||
                        membership.state === MembershipState.Revoked
                      }
                    >
                      Revoke
                    </Button>
                  </Table.Cell>
                </>}
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>

      {/* Display form state messages */}
      {state.message && (
        <Text size="2" color={state.success ? "green" : "red"} mt="2">
          {state.message}
        </Text>
      )}
    </>
  );
}
