/**
 * Account Page - Displays account details and repositories
 * 
 * KEEP IT SIMPLE:
 * 1. URL params are known values (/[account_id])
 * 2. Get data -> Transform if needed -> Render
 * 3. Trust your types, avoid complex validation
 * 4. Let Next.js handle errors (404, 500, etc.)
 * 5. No helper functions unless truly needed
 */

import { notFound } from 'next/navigation';
import { Container } from '@radix-ui/themes';
import { IndividualProfile } from '@/components/features/profiles';
import { OrganizationProfile } from '@/components/features/profiles';
import { fetchAccount, fetchRepositoriesByAccount, fetchOrganizationMembers } from '@/lib/db';
import type { Account, OrganizationalAccount } from '@/types';

interface PageProps {
  params: Promise<{ account_id: string }>;
}

export default async function AccountPage({ params }: PageProps) {
  const { account_id } = await params;

  // Get account data
  const account = await fetchAccount(account_id);
  if (!account) {
    notFound();
  }

  // Get repositories for this account
  const repositories = await fetchRepositoriesByAccount(account_id);

  // If this is an organization, get member details
  if (account.type === 'organization') {
    const { owner, admins, members } = await fetchOrganizationMembers(account as OrganizationalAccount);
    return (
      <Container size="4" py="6">
        <OrganizationProfile
          account={account as OrganizationalAccount}
          repositories={repositories}
          owner={owner}
          admins={admins}
          members={members}
        />
      </Container>
    );
  }

  // For individual accounts
  return (
    <Container size="4" py="6">
      <IndividualProfile
        account={account}
        ownedRepositories={repositories}
        contributedRepositories={[]}
        organizations={[]}
      />
    </Container>
  );
} 