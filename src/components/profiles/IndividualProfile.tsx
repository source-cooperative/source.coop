import { ProfileLayout } from './ProfileLayout';
import type { Account } from '@/types/account';

export function IndividualProfile({ account }: { account: Account }) {
  const fields = [
    { label: 'Name', value: account.name || '' },
    { label: 'Email', value: account.email || '' },
    ...(account.website ? [{ label: 'Website', value: account.website, isLink: true }] : []),
    // Add other fields as needed
  ];

  return (
    <ProfileLayout 
      description={account.description || 'Individual account'}
      fields={fields}
    />
  );
} 