/**
 * Account Page - Displays account details and products
 *
 * This server component handles both individual and organizational accounts.
 * It fetches account data, products, and organization members (if applicable).
 *
 * @param params - Route parameters containing account_id
 * @param searchParams - URL search parameters, including welcome flag for onboarding
 * @returns Rendered profile component based on account type
 * @throws {notFound} If account does not exist
 */

import { notFound } from "next/navigation";
import { IndividualProfile } from "@/components/features/profiles";
import { OrganizationProfilePage } from "@/components/features/profiles/OrganizationProfilePage";
import {
  accountsTable,
  isOrganizationalAccount,
  membershipsTable,
  productsTable,
} from "@/lib/clients/database";
import { getPageSession } from "@/lib/api/utils";
import { IndividualAccount, Actions } from "@/types";
import { isAuthorized } from "@/lib/api/authz";

type PageProps = {
  params: Promise<{ account_id: string }>;
  searchParams: Promise<{ welcome?: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { account_id } = await params;
  const account = await accountsTable.fetchById(account_id);
  const title = account!.name;
  return { title, description: title };
}

export default async function AccountPage({ params, searchParams }: PageProps) {
  const { account_id } = await params;
  const { welcome } = await searchParams;
  const showWelcome = welcome === "true";

  // Get account data
  const account = await accountsTable.fetchById(account_id);
  if (!account) {
    notFound();
  }

  // Get session to check authentication status
  const session = await getPageSession();
  const isAuthenticated = !!session?.account;
  const isAccountOwner = session && session.identity_id === account.identity_id;

  // If this is an organization, use the organization profile page
  if (isOrganizationalAccount(account)) {
    return <OrganizationProfilePage account={account} />;
  }

  // Get repositories for individual account
  let { products, lastEvaluatedKey } = await productsTable.listByAccount(
    account_id,
    1000
  );

  // Filter products based on authentication status
  if (!isAuthenticated || !isAccountOwner) {
    products = products.filter((product) => product.visibility === "public");
  }

  const memberships = (await membershipsTable.listByUser(account_id)).filter(
    (membership) => isAuthorized(account, membership, Actions.GetMembership)
  );
  const organizations = (
    await accountsTable.fetchManyByIds(
      memberships.map((membership) => membership.membership_account_id)
    )
  ).filter(isOrganizationalAccount);

  // For individual accounts
  return (
    <IndividualProfile
      account={account as IndividualAccount}
      isOwner={isAccountOwner ?? false}
      ownedProducts={products}
      contributedProducts={[]}
      organizations={organizations}
      showWelcome={showWelcome}
    />
  );
}
