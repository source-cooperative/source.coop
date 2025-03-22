import { Box, Heading, Text, Link as RadixLink, Flex, Grid } from '@radix-ui/themes';
import Link from 'next/link';
import type { OrganizationalAccount, IndividualAccount, Repository } from '@/types';
import { RepositoryList } from '@/components/features/repositories/RepositoryList';
import { OrganizationMembers } from './OrganizationMembers';
import { ProfileAvatar } from './ProfileAvatar';

interface OrganizationProfileProps {
  account: OrganizationalAccount;
  repositories: Repository[];
  owner: IndividualAccount | null;
  admins: IndividualAccount[];
  members: IndividualAccount[];
}

export function OrganizationProfile({ 
  account, 
  repositories,
  owner,
  admins,
  members 
}: OrganizationProfileProps) {
  return (
    <Box>
      <Flex gap="4" mb="6">
        <ProfileAvatar account={account} size="8" />
        <Box>
          <Heading as="h1" size="8">{account.name}</Heading>
          <Text as="p" size="3" color="gray" mt="1">
            {account.description}
          </Text>
        </Box>
      </Flex>

      <Grid columns="2" gap="6" mb="6">
        <Box>
          <Heading as="h2" size="4" mb="2">Organization Details</Heading>
          {account.website && (
            <Text as="p" size="2">
              Website: <RadixLink href={account.website}>{account.website}</RadixLink>
            </Text>
          )}
          {account.email && (
            <Text as="p" size="2">
              Email: <RadixLink href={`mailto:${account.email}`}>{account.email}</RadixLink>
            </Text>
          )}
          {account.ror_id && (
            <Text as="p" size="2">
              ROR ID: <RadixLink href={`https://ror.org/${account.ror_id}`}>{account.ror_id}</RadixLink>
            </Text>
          )}
        </Box>

        <Box>
          <Heading as="h2" size="4" mb="2">Members</Heading>
          <OrganizationMembers 
            owner={owner}
            admins={admins}
            members={members}
          />
        </Box>
      </Grid>

      <Box>
        <Heading as="h2" size="4" mb="4">Repositories</Heading>
        <RepositoryList repositories={repositories} />
      </Box>
    </Box>
  );
} 