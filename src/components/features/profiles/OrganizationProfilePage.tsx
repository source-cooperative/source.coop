import { Container } from '@radix-ui/themes';
import { OrganizationProfile } from './OrganizationProfile';
import { fetchAccount, fetchRepositoriesByAccount, fetchOrganizationMembers } from '@/lib/db';
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
  const account = await fetchAccount(account_id);
  if (!account || !isOrganizationalAccount(account)) {
    notFound();
  }

  // Get repositories for this account
  const repositories = await fetchRepositoriesByAccount(account_id);

  // Get member details
  const { owner, admins, members } = await fetchOrganizationMembers(account);

  return (
    <Container size="4" py="6">
      <OrganizationProfile
        account={account}
        repositories={repositories}
        owner={owner}
        admins={admins}
        members={members}
      />
    </Container>
  );
} 