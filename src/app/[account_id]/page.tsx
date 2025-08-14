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
import { Container } from "@radix-ui/themes";
import { IndividualProfile } from "@/components/features/profiles";
import { OrganizationProfilePage } from "@/components/features/profiles/OrganizationProfilePage";
import type { IndividualAccount } from "@/types/account_v2";
import type { Product } from "@/types";
import { accountsTable, productsTable } from "@/lib/clients/database";
import { getServerSession } from "@ory/nextjs/app";
import type { ExtendedSession } from "@/types/session";

type PageProps = {
  params: Promise<{ account_id: string }>;
  searchParams: Promise<{ welcome?: string }>;
};

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
  const session = (await getServerSession()) as ExtendedSession;
  const isAuthenticated = !!session?.active;
  const isAccountOwner =
    session?.identity?.metadata_public?.account_id === account_id;

  // If this is an organization, use the organization profile page
  if (account.type === "organization") {
    return <OrganizationProfilePage account_id={account_id} />;
  }

  // Get repositories for individual account
  let { products, lastEvaluatedKey } = await productsTable.listByAccount(
    //
    account_id
  );

  // Filter products based on authentication status
  if (!isAuthenticated || !isAccountOwner) {
    products = products.filter((product) => product.visibility === "public");
  }

  // For individual accounts
  return (
    <Container size="4" py="6">
      <IndividualProfile
        account={account as IndividualAccount}
        ownedProducts={products}
        contributedProducts={[]}
        organizations={[]}
        showWelcome={showWelcome}
        ownedProductsHasNextPage={!!lastEvaluatedKey}
        ownedProductsNextCursor={lastEvaluatedKey}
      />
    </Container>
  );
}
