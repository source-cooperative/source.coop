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
import { OrganizationProfilePage } from '@/components/features/profiles/OrganizationProfilePage';
import { fetchAccount, fetchRepositoriesByAccount } from '@/lib/db';
import type { Account, IndividualAccount } from '@/types/account_v2';
import type { Repository_v2 } from '@/types/repository_v2';

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

  // If this is an organization, use the organization profile page
  if (account.type === 'organization') {
    return <OrganizationProfilePage account_id={account_id} />;
  }

  // Get repositories for individual account
  const repositories: Repository_v2[] = await fetchRepositoriesByAccount(account_id);

  // For individual accounts
  return (
    <Container size="4" py="6">
      <IndividualProfile
        account={account as IndividualAccount}
        ownedRepositories={repositories}
        contributedRepositories={[]}
        organizations={[]}
        showWelcome={showWelcome}
      />
    </Container>
  );
} 