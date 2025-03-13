import { ProfileLayout } from '@/components/profiles/ProfileLayout';
import type { Account, OrganizationalAccount } from '@/types/account';

export function OrganizationProfile({ account }: { account: OrganizationalAccount }) {
  const fields = [
    { label: 'Organization', value: account.name },
    { label: 'Contact Email', value: account.email || 'Not provided' },
    { label: 'Website', value: account.website || '', isLink: true },
    { label: 'Description', value: account.description || 'No description provided' },
  ];

  return (
    <ProfileLayout 
      description={account.description || 'Organization account'}
      fields={fields}
    />
  );
} 