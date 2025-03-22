import { Container, Box, Heading, Text, Grid, Card, Flex } from '@radix-ui/themes';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Account, Repository } from '@/types';
import { fetchRepositories } from '@/lib/db/operations';

interface PageProps {
  params: {
    account_id: string;
  };
}

export default async function EditAccountPage({ params }: PageProps) {
  const { account_id } = params;

  // TODO: Replace with actual Ory.sh session check and account fetch
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/${account_id}`);
  if (!response.ok) {
    notFound();
  }

  const account: Account = await response.json();
  const { repositories: allRepositories } = await fetchRepositories();
  const repositories = allRepositories.filter(repo => repo.account.account_id === account_id);

  return (
    <Container>
      <Box py="9">
        <Heading size="8" mb="6">Account Management</Heading>

        <Grid columns="2" gap="4" mb="8">
          <Card>
            <Box p="4">
              <Heading size="4" mb="2">Organizations</Heading>
              <Text as="p" color="gray" mb="4">
                Organizations you manage or are a member of
              </Text>
              <Flex direction="column" gap="2">
                {/* TODO: Replace with actual organizations list */}
                <Link href={`/${account_id}/organization/new`}>
                  <Text>Create New Organization</Text>
                </Link>
              </Flex>
            </Box>
          </Card>

          <Card>
            <Box p="4">
              <Heading size="4" mb="2">Repositories</Heading>
              <Text as="p" color="gray" mb="4">
                Repositories you own or have access to
              </Text>
              <Flex direction="column" gap="2">
                {repositories.map((repo) => (
                  <Link key={repo.repository_id} href={`/${account_id}/${repo.repository_id}/edit`}>
                    <Text>{repo.title}</Text>
                  </Link>
                ))}
                <Link href={`/${account_id}/repositories/new`}>
                  <Text>Create New Repository</Text>
                </Link>
              </Flex>
            </Box>
          </Card>
        </Grid>

        <Card>
          <Box p="4">
            <Heading size="4" mb="2">Account Settings</Heading>
            <Text as="p" color="gray" mb="4">
              Manage your account information and preferences
            </Text>
            <Flex direction="column" gap="2">
              <Link href={`/${account_id}/settings`}>
                <Text>Edit Profile</Text>
              </Link>
              <Link href={`/${account_id}/settings/security`}>
                <Text>Security Settings</Text>
              </Link>
            </Flex>
          </Box>
        </Card>
      </Box>
    </Container>
  );
} 