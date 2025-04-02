/**
 * Account Page - Displays account details and repositories
 * 
 * This server component handles both individual and organizational accounts.
 * It fetches account data, repositories, and organization members (if applicable).
 * 
 * @param params - Route parameters containing account_id
 * @param searchParams - URL search parameters, including welcome flag for onboarding
 * @returns Rendered profile component based on account type
 * @throws {notFound} If account does not exist
 */

import { notFound } from 'next/navigation';
import { Container } from '@radix-ui/themes';
import { IndividualProfile } from '@/components/features/profiles';
import { OrganizationProfile } from '@/components/features/profiles';
import { fetchAccount, fetchRepositoriesByAccount, fetchOrganizationMembers } from '@/lib/db';
import type { _Account, OrganizationalAccount, Repository } from '@/types';

type PageProps = {
  params: Promise<{ account_id: string }>;
  searchParams: Promise<{ welcome?: string }>;
};

export default async function AccountPage({ 
  params,
  searchParams 
}: PageProps) {
  const { account_id } = await params;
  const { welcome } = await searchParams;
  const showWelcome = welcome === 'true';

  // Get account data
  const account = await fetchAccount(account_id);
  if (!account) {
    notFound();
  }

  // Get repositories for this account
  const repositories: Repository[] = await fetchRepositoriesByAccount(account_id);

  // If this is an organization, get member details
  if (account.type === 'organization') {
    const orgAccount = account as OrganizationalAccount;
    const { owner, admins, members } = await fetchOrganizationMembers(orgAccount);
    return (
      <Container size="4" py="6">
        <OrganizationProfile
          account={orgAccount}
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
        showWelcome={showWelcome}
      />
    </Container>
  );
} 