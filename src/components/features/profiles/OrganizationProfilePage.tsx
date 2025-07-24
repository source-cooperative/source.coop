import { Container } from '@radix-ui/themes';
import { OrganizationProfile } from './OrganizationProfile';
import { accountsTable, productsTable } from "@/lib/clients/database";
import { notFound } from 'next/navigation';
import type { Account } from "@/types/account";
import type { OrganizationalAccount } from "@/types/account_v2";
import { getServerSession } from "@ory/nextjs/app";
import type { ExtendedSession } from "@/types/session";

function isOrganizationalAccount(
  account: Account
): account is OrganizationalAccount {
  return account.type === "organization";
}

interface OrganizationProfilePageProps {
  account_id: string;
}

export async function OrganizationProfilePage({ account_id }: OrganizationProfilePageProps) {
  // Get account data
  const account = await accountsTable.fetchById(account_id);
  if (!account || !isOrganizationalAccount(account)) {
    notFound();
  }

  // Get session to check authentication status
  const session = await getServerSession() as ExtendedSession;
  const isAuthenticated = !!session?.active;
  const isMember = isAuthenticated && (
    session?.identity?.metadata_public?.account_id === account.metadata_public.owner_account_id ||
    account.metadata_public.admin_account_ids?.includes(session?.identity?.metadata_public?.account_id || '') ||
    account.metadata_public.member_account_ids?.includes(session?.identity?.metadata_public?.account_id || '')
  );

  // Get products for this account
  let products = await productsTable.listByAccount(account_id);

  // Filter products based on authentication status
  if (!isAuthenticated || !isMember) {
    products = products.filter(product => product.visibility === 'public');
  }

  // Get member details
  const { owner, admins, members } = await accountsTable.listOrgMembers(account);

  return (
    <Container size="4" py="6">
      <OrganizationProfile
        account={account}
        products={products}
        owner={owner}
        admins={admins}
        members={members}
      />
    </Container>
  );
} 