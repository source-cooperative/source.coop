import { notFound } from 'next/navigation';
import { Heading, Text, Flex } from '@radix-ui/themes';
import { exampleAccounts } from '@/fixtures/example-accounts';
import { OrganizationProfile } from '@/components/profiles/OrganizationProfile';
import { IndividualProfile } from '@/components/profiles/IndividualProfile';

// Add this export to generate static paths
export function generateStaticParams() {
  return exampleAccounts.map((account) => ({
    account_id: account.id,
  }));
}

export default function AccountPage({ params }: { params: { account_id: string } }) {
  const account = exampleAccounts.find(a => a.id === params.account_id);
  
  if (!account) {
    notFound();
  }

  return (
    <Flex direction="column" gap="4">
      <Heading size="8">{account.name}</Heading>
      
      {account.type === 'organization' ? (
        <OrganizationProfile org={account} />
      ) : (
        <IndividualProfile individual={account} />
      )}
    </Flex>
  );
} 