import { Container, Heading, Text, Flex, Box, Table } from '@radix-ui/themes';

import { RepositoryListItem } from '@/components';

import type { Repository } from '@/types';
import type { Account } from '@/types/account';

import { fetchRepositories, fetchAccounts } from '@/lib/db/operations';
import { notFound } from 'next/navigation';

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

  const accountRepositories = repositories.filter(
    repo => repo.account.account_id === account_id
  );

  return (
    <Container size="4" py="6">
      <Flex direction="column" gap="6">
        <Box>
          <Heading size="8" mb="2">{account.name}</Heading>
          <Text size="4" color="gray" mb="4">Account Details</Text>
          
          <Table.Root mb="6">
            <Table.Body>
              <Table.Row>
                <Table.Cell>Type</Table.Cell>
                <Table.Cell>{account.type}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>Created</Table.Cell>
                <Table.Cell>{new Date(account.created_at).toLocaleDateString()}</Table.Cell>
              </Table.Row>
              {account.description && (
                <Table.Row>
                  <Table.Cell>Description</Table.Cell>
                  <Table.Cell>{account.description}</Table.Cell>
                </Table.Row>
              )}
              {account.type === 'individual' && (
                <>
                  <Table.Row>
                    <Table.Cell>Email</Table.Cell>
                    <Table.Cell>{account.email}</Table.Cell>
                  </Table.Row>
                  {account.orcid && (
                    <Table.Row>
                      <Table.Cell>ORCID</Table.Cell>
                      <Table.Cell>{account.orcid}</Table.Cell>
                    </Table.Row>
                  )}
                </>
              )}
              {account.type === 'organization' && (
                <>
                  {account.ror_id && (
                    <Table.Row>
                      <Table.Cell>ROR ID</Table.Cell>
                      <Table.Cell>{account.ror_id}</Table.Cell>
                    </Table.Row>
                  )}
                  <Table.Row>
                    <Table.Cell>Owner ID</Table.Cell>
                    <Table.Cell>{account.owner_account_id}</Table.Cell>
                  </Table.Row>
                </>
              )}
              {account.website && (
                <Table.Row>
                  <Table.Cell>Website</Table.Cell>
                  <Table.Cell>{account.website}</Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>

          <Text size="4" color="gray" mb="4">Repositories ({accountRepositories.length})</Text>
        </Box>

        {accountRepositories.map(repository => (
          <RepositoryListItem 
            key={`${repository.account.account_id}/${repository.repository_id}`}
            repository={repository}
            account={account}
          />
        ))}
      </Flex>
    </Container>
  );
} 