import { Metadata } from "next";
import { Box, Flex, Text } from "@radix-ui/themes";
import { Actions, MembershipRole, MembershipState } from "@/types";
import {
  accountsTable,
  membershipsTable,
  productsTable,
} from "@/lib/clients/database";
import { FormTitle, InviteMemberForm, MembershipsTable } from "@/components";
import { notFound, redirect } from "next/navigation";
import { getPageSession } from "@/lib";
import { isAuthorized } from "@/lib/api/authz";
import { editAccountProfileUrl, editAccountMembershipsUrl } from "@/lib/urls";
import Link from "next/link";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { account_id, product_id } = await params;
  const product = await productsTable.fetchById(account_id, product_id);
  return { title: `Edit ${product!.title} memberships` };
}
interface PageProps {
  params: Promise<{ account_id: string; product_id: string }>;
}

export default async function MembershipsPage({ params }: PageProps) {
  const { account_id, product_id } = await params;
  const account = await accountsTable.fetchById(account_id);
  const userSession = await getPageSession();
  if (!account || !userSession) {
    notFound();
  }
  const product = await productsTable.fetchById(account_id, product_id);
  if (!product) {
    notFound();
  }

  if (!isAuthorized(userSession, product, Actions.ListRepositoryMemberships)) {
    redirect(editAccountProfileUrl(account_id));
  }

  const memberships = await membershipsTable.listByAccount(
    account_id,
    product_id
  );
  const activeMemberships = memberships.sort((a, b) => {
    // Define role hierarchy: Owners > Maintainers > Writers > Readers
    const roleOrder = {
      [MembershipRole.Owners]: 0,
      [MembershipRole.Maintainers]: 1,
      [MembershipRole.WriteData]: 2,
      [MembershipRole.ReadData]: 3,
    };

    return roleOrder[a.role] - roleOrder[b.role];
  });

  const activeOrgMemberships = (await membershipsTable.listByAccount(account_id))
    .filter((m) => m.state === MembershipState.Member)
    .sort((a, b) => {
      const roleOrder = {
        [MembershipRole.Owners]: 0,
        [MembershipRole.Maintainers]: 1,
        [MembershipRole.WriteData]: 2,
        [MembershipRole.ReadData]: 3,
      };

      return roleOrder[a.role] - roleOrder[b.role];
    });

  // Get account details for each membership
  const memberAccountIds = [
    ...new Set([
      ...activeMemberships.map((m) => m.account_id),
      ...activeOrgMemberships.map((m) => m.account_id),
    ]),
  ];
  const memberAccounts = await accountsTable.fetchManyByIds(memberAccountIds);
  const memberAccountsMap = new Map(
    memberAccounts.map((acc) => [acc.account_id, acc])
  );

  const canInviteMembership = isAuthorized(
    userSession,
    {
      membership_account_id: account.account_id,
      repository_id: product.product_id,
    },
    Actions.InviteMembership
  );

  return (
    <Box>
      <Flex justify="between" align="center" mb="6">
        <FormTitle
          title="Memberships"
          description="Manage product members and their roles"
        />
        {canInviteMembership && (
          <InviteMemberForm organization={account} product={product} />
        )}
      </Flex>

      <Box>
        <Text size="4" weight="medium" as="p">
          Product Members
        </Text>
        <Text size="2" color="gray">
          The following users have been explicitly granted access to this product
        </Text>
        <MembershipsTable
          memberships={activeMemberships}
          memberAccountsMap={memberAccountsMap}
          userSession={userSession}
          emptyStateMessage="No members yet"
          emptyStateDescription="Invite people to join your product"
        />
      </Box>

      <Box mt="8">
        <Text size="4" weight="medium" as="p">
          Organization Members
        </Text>
        <Text size="2" color="gray">
          The following users have implicit access to this product via their{" "}
          <Link href={editAccountMembershipsUrl(account_id)}>
            organization membership
          </Link>
        </Text>
        <MembershipsTable
          memberships={activeOrgMemberships}
          memberAccountsMap={memberAccountsMap}
          userSession={userSession}
          emptyStateMessage="No organization members"
          emptyStateDescription="Organization has no members"
          editable={false}
        />
      </Box>
    </Box>
  );
}
