"use client";

import { Text, Table, Flex, Button, Badge } from "@radix-ui/themes";
import { PersonIcon } from "@radix-ui/react-icons";
import {
  Membership,
  Account,
  isServiceAccount,
  MembershipRole,
  MembershipState,
  Actions,
  UserSession,
} from "@/types";
import { AvatarLinkCompact } from "@/components/core/AccountLinks";
import { isAuthorized } from "@/lib/api/authz";
import { revokeMembership } from "@/lib/actions/memberships";
import Form from "next/form";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("MembershipsTable");
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
            <Table.ColumnHeaderCell>{t("member")}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t("role")}</Table.ColumnHeaderCell>
            {editable && <>
              <Table.ColumnHeaderCell>{t("status")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("lastUpdated")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("actions")}</Table.ColumnHeaderCell>
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
                  {memberAccount && isServiceAccount(memberAccount) ? (
                    // Badged, and not a link: a machine has no profile page.
                    <Flex gap="2" align="center">
                      <AvatarLinkCompact
                        account={memberAccount}
                        size="1"
                        link={false}
                      />
                      <Badge size="1" color="gray" variant="outline">
                        {t("serviceAccount")}
                      </Badge>
                    </Flex>
                  ) : (
                    <AvatarLinkCompact account={memberAccount!} size="1" />
                  )}
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
                      [MembershipRole.Owners]: t("roleOwner"),
                      [MembershipRole.Maintainers]: t("roleMaintainer"),
                      [MembershipRole.WriteData]: t("roleWriter"),
                      [MembershipRole.ReadData]: t("roleReader"),
                    }[membership.role] || t("unknown")}
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
                        [MembershipState.Member]: t("stateMember"),
                        [MembershipState.Invited]: t("stateInvited"),
                        [MembershipState.Revoked]: t("stateRevoked"),
                      }[membership.state] || t("unknown")}
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
                      {t("revoke")}
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
