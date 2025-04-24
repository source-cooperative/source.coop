import { Container } from '@radix-ui/themes';
import { OrganizationProfile } from './OrganizationProfile';
import { accountsTable, productsTable } from "@/lib/clients/database";
import { notFound } from 'next/navigation';
import type { Account, OrganizationalAccount } from '@/types/account_v2';

function isOrganizationalAccount(account: Account): account is OrganizationalAccount {
  return account.type === 'organization';
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

  // Get products for this account
  const products = await productsTable.listByAccount(account_id);

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