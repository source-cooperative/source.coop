import { Container } from "@radix-ui/themes";
import { OrganizationProfile } from "./OrganizationProfile";
import {
  accountsTable,
  isIndividualAccount,
  membershipsTable,
  productsTable,
} from "@/lib/clients/database";
import {
  type IndividualAccount,
  type OrganizationalAccount,
  MembershipRole,
  MembershipState,
} from "@/types";
import { getPageSession } from "@/lib/api/utils";

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

  // Only consider active memberships
  memberships = memberships.filter(
    (membership) => membership.state === MembershipState.Member
  );

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

  return (
    <Container size="4" py="6">
      <OrganizationProfile
        account={account}
        products={products}
        owners={owners}
        admins={admins}
        members={members}
      />
    </Container>
  );
}
