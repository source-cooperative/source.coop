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

// External packages
import { notFound } from 'next/navigation';
import { Container } from '@radix-ui/themes';

// Internal components
import { IndividualProfile, OrganizationProfile } from '@/components/features/profiles';

// Types
import type { Repository, Account } from '@/types';

// Utilities
import { fetchRepositories, fetchAccounts } from '@/lib/db/operations';

export default async function AccountPage({ 
  params 
}: { 
  params: { 
    account_id: string;
  }
}) {
  const { account_id } = await Promise.resolve(params);
  const [repositories, accounts] = await Promise.all([
    fetchRepositories(),
    fetchAccounts()
  ]);
  
  const account = accounts.find(acc => acc.account_id === account_id);
  if (!account) {
    notFound();
  }

  // Get repositories owned by this account
  const ownedRepositories = repositories.filter(
    repo => repo.account.account_id === account_id
  );

  if (account.type === 'individual') {
    // Get organizations this individual belongs to
    const organizations = accounts.filter(acc => 
      acc.type === 'organization' && 
      (acc.owner_account_id === account_id || acc.admin_account_ids.includes(account_id))
    );

    // Get repositories this individual contributes to
    const contributedRepositories = repositories.filter(repo => 
      repo.account.account_id !== account_id && // Not owned by this user
      repo.contributors?.includes(account_id) // User is a contributor
    );

    return (
      <Container size="4" py="6">
        <IndividualProfile
          account={account}
          ownedRepositories={ownedRepositories}
          contributedRepositories={contributedRepositories}
          organizations={organizations}
        />
      </Container>
    );
  } else {
    // Get owner account
    const owner = accounts.find(acc => acc.account_id === account.owner_account_id);
    if (!owner) {
      notFound();
    }

    // Get all members (admins + regular members)
    const members = accounts.filter(acc => 
      acc.type === 'individual' && 
      (acc.account_id === account.owner_account_id || account.admin_account_ids.includes(acc.account_id))
    );

    return (
      <Container size="4" py="6">
        <OrganizationProfile
          account={account}
          repositories={ownedRepositories}
          members={members}
          owner={owner}
        />
      </Container>
    );
  }
} 