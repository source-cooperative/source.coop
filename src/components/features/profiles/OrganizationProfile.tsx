import { Flex, Box, Text, Grid, Heading, Link as RadixLink } from '@radix-ui/themes';
import Link from 'next/link';
import type { Account, OrganizationalAccount } from '@/types/account';
import type { Repository } from '@/types';
import { ProfileAvatar } from './ProfileAvatar';
import { RepositoryList } from '../repositories/RepositoryList';

interface OrganizationProfileProps {
  account: OrganizationalAccount;
  repositories: Repository[];
  members: Account[];
  owner: Account;
}

export function OrganizationProfile({ 
  account, 
  repositories,
  members,
  owner
}: OrganizationProfileProps) {
  return (
    <Grid columns="1" gap="6">
      {/* Profile Header */}
      <Flex gap="4" align="center">
        <ProfileAvatar account={account} size="6" />
        <Box>
          <Heading size="8">{account.name}</Heading>
          {account.description && (
            <Text size="3" color="gray">{account.description}</Text>
          )}
        </Box>
      </Flex>

      {/* Profile Details */}
      <Grid columns="3" gap="4">
        {account.email && (
          <Box>
            <Text as="div" size="2" color="gray" mb="2">Contact Email</Text>
            <Text>{account.email}</Text>
          </Box>
        )}
        {account.website && (
          <Box>
            <Text as="div" size="2" color="gray" mb="2">Website</Text>
            <RadixLink asChild>
              <a href={account.website} target="_blank" rel="noopener noreferrer">
                {account.website}
              </a>
            </RadixLink>
          </Box>
        )}
        {account.ror_id && (
          <Box>
            <Text as="div" size="2" color="gray" mb="2">ROR ID</Text>
            <RadixLink asChild>
              <a href={`https://ror.org/${account.ror_id}`} target="_blank" rel="noopener noreferrer">
                {account.ror_id}
              </a>
            </RadixLink>
          </Box>
        )}
      </Grid>

      {/* Members */}
      <Box>
        <Heading size="4" mb="4">Members</Heading>
        <Grid columns="3" gap="4">
          {/* Owner */}
          <Link href={`/${owner.account_id}`} passHref legacyBehavior>
            <RadixLink>
              <Flex gap="2" align="center">
                <ProfileAvatar account={owner} size="2" />
                <Box>
                  <Text>{owner.name}</Text>
                  <Text size="1" color="gray">Owner</Text>
                </Box>
              </Flex>
            </RadixLink>
          </Link>
          
          {/* Other Members */}
          {members
            .filter(member => member.account_id !== owner.account_id)
            .map(member => (
              <Link key={member.account_id} href={`/${member.account_id}`} passHref legacyBehavior>
                <RadixLink>
                  <Flex gap="2" align="center">
                    <ProfileAvatar account={member} size="2" />
                    <Box>
                      <Text>{member.name}</Text>
                      <Text size="1" color="gray">
                        {account.admin_account_ids.includes(member.account_id) ? 'Admin' : 'Member'}
                      </Text>
                    </Box>
                  </Flex>
                </RadixLink>
              </Link>
            ))}
        </Grid>
      </Box>

      {/* Repositories */}
      {repositories.length > 0 && (
        <Box>
          <Heading size="4" mb="4">Repositories</Heading>
          <RepositoryList repositories={repositories} />
        </Box>
      )}
    </Grid>
  );
} 