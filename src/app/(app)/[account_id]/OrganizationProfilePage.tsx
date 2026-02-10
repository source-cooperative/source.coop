import { Container, Box } from "@radix-ui/themes";
import { OrganizationProfile } from "@/components/features/profiles/OrganizationProfile";
import { PendingInvitationBanner } from "@/components";
import {
  accountsTable,
  isIndividualAccount,
  membershipsTable,
  productsTable,
} from "@/lib/clients/database";
import {
  type IndividualAccount,
  type OrganizationalAccount,
  Actions,
  MembershipRole,
  MembershipState,
} from "@/types";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { getPendingInvitation } from "@/lib/actions/memberships";

interface OrganizationProfilePageProps {
  account: OrganizationalAccount;
}

export async function OrganizationProfilePage({
  account,
}: OrganizationProfilePageProps) {
  // Get session to check authentication status
  const session = await getPageSession();
  const isAuthenticated = session?.account && !session.account.disabled;

  let [memberships, { products }] = await Promise.all([
    membershipsTable.listByAccount(account.account_id),
    productsTable.listByAccount(account.account_id),
  ]);

  memberships = memberships
    // Only consider active memberships
    .filter((membership) => membership.state === MembershipState.Member)
    // Only consider memberships that are not product-specific
    .filter((membership) => membership.repository_id === undefined);

  const relatedUserAccounts = new Map(
    (
      await accountsTable.fetchManyByIds(
        memberships.map((membership) => membership.account_id)
      )
    ).map((account) => [account.account_id, account])
  );

  const owners = memberships
    .filter((membership) => membership.role === MembershipRole.Owners)
    .map((membership) => relatedUserAccounts.get(membership.account_id))
    .filter(
      (account): account is IndividualAccount =>
        !!account && isIndividualAccount(account)
    );

  const admins = memberships
    .filter((membership) => membership.role === MembershipRole.Maintainers)
    .map((membership) => relatedUserAccounts.get(membership.account_id))
    .filter(
      (account): account is IndividualAccount =>
        !!account && isIndividualAccount(account)
    );

  const members = memberships
    .filter((membership) => membership.role === MembershipRole.ReadData)
    .map((membership) => relatedUserAccounts.get(membership.account_id))
    .filter(
      (account): account is IndividualAccount =>
        !!account && isIndividualAccount(account)
    );

  // Check if the authenticated user is a member of this organization
  const isMember =
    isAuthenticated &&
    session?.account &&
    memberships
      .map((membership) => membership.account_id)
      .includes(session.account.account_id);

  // Filter products based on authentication status
  if (!isAuthenticated || !isMember) {
    products = products.filter((product) => product.visibility === "public");
  }

  // Check for pending invitation
  const pendingInvitation = await getPendingInvitation(account.account_id);

  return (
    <Container size="4">
      {/* Show pending invitation banner if exists */}
      {pendingInvitation && (
        <PendingInvitationBanner
          invitation={pendingInvitation}
          organizationName={account.name}
        />
      )}

      <Box py="6">
        <OrganizationProfile
          account={account}
          products={products}
          owners={owners}
          admins={admins}
          members={members}
          canEdit={isAuthorized(session, account, Actions.PutAccountProfile)}
        />
      </Box>
    </Container>
  );
}
