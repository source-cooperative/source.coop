import { Card, Flex, Text, Link as RadixLink } from '@radix-ui/themes';
import Link from 'next/link';
import { exampleAccounts } from '@/fixtures/example-accounts';

export function AccountList() {
  return (
    <Flex direction="column" gap="3">
      {exampleAccounts.map(account => (
        <Link key={account.id} href={`/${account.id}`} style={{ textDecoration: 'none' }}>
          <Card>
            <Flex direction="column" gap="2">
              <Text size="5" weight="bold">{account.name}</Text>
              <Text color="gray">{account.description}</Text>
              <Text size="2">
                {account.type === 'organization' 
                  ? `${account.orgType} organization` 
                  : 'Individual account'}
              </Text>
            </Flex>
          </Card>
        </Link>
      ))}
    </Flex>
  );
} 