import { Flex, Box, Text, Grid, Heading, Link as RadixLink } from '@radix-ui/themes';
import Link from 'next/link';
import type { Account, IndividualAccount } from '@/types/account';
import type { Repository } from '@/types';
import { ProfileAvatar } from './ProfileAvatar';
import { RepositoryList } from '../repositories/RepositoryList';

interface IndividualProfileProps {
  account: IndividualAccount;
  ownedRepositories: Repository[];
  contributedRepositories: Repository[];
  organizations: Account[];
}

export function IndividualProfile({ 
  account, 
  ownedRepositories, 
  contributedRepositories,
  organizations 
}: IndividualProfileProps) {
  return (
    <Box>
      {/* Profile Header */}
      <Box mb="6">
        <Flex gap="4" align="center">
          <ProfileAvatar account={account} size="6" />
          <Box>
            <Heading size="8">{account.name}</Heading>
            {account.description && (
              <Text size="3" color="gray">{account.description}</Text>
            )}
          </Box>
        </Flex>
      </Box>

      {/* Profile Details */}
      <Box mb="6">
        <Grid columns="3" gap="4">
          <Box>
            <Text as="div" size="2" color="gray" mb="2">Email</Text>
            <Text>{account.email}</Text>
          </Box>
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
          {account.orcid && (
            <Box>
              <Text as="div" size="2" color="gray" mb="2">ORCID</Text>
              <RadixLink asChild>
                <a href={`https://orcid.org/${account.orcid}`} target="_blank" rel="noopener noreferrer">
                  {account.orcid}
                </a>
              </RadixLink>
            </Box>
          )}
        </Grid>
      </Box>

      {/* Organizations */}
      {organizations.length > 0 && (
        <Box mb="6">
          <Heading size="4" mb="4">Organizations</Heading>
          <Grid columns="3" gap="4">
            {organizations.map(org => (
              <Link key={org.account_id} href={`/${org.account_id}`} passHref legacyBehavior>
                <RadixLink>
                  <Flex gap="2" align="center">
                    <ProfileAvatar account={org} size="2" />
                    <Text>{org.name}</Text>
                  </Flex>
                </RadixLink>
              </Link>
            ))}
          </Grid>
        </Box>
      )}

      {/* Owned Repositories */}
      {ownedRepositories.length > 0 && (
        <Box mb="6">
          <Heading size="4" mb="4">Repositories</Heading>
          <RepositoryList repositories={ownedRepositories} />
        </Box>
      )}

      {/* Contributed Repositories */}
      {contributedRepositories.length > 0 && (
        <Box>
          <Heading size="4" mb="4">Contributed Repositories</Heading>
          <RepositoryList repositories={contributedRepositories} />
        </Box>
      )}
    </Box>
  );
} 