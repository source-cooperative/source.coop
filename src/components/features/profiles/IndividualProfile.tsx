// Server Component
import { Box, Text, Grid, Heading, Flex, Link as RadixLink } from '@radix-ui/themes';
import Link from 'next/link';
import type { Account, IndividualAccount } from '@/types/account_v2';
import type { Repository_v2 } from '@/types/repository_v2';
import { ProfileAvatar } from './ProfileAvatar';
import { RepositoryList } from '../repositories/RepositoryList';
import { WebsiteLink } from './WebsiteLink';
import { EmailVerificationStatus } from './EmailVerificationStatus';
import { IndividualProfileActions } from './IndividualProfileActions';

interface IndividualProfileProps {
  account: IndividualAccount;
  ownedRepositories: Repository_v2[];
  contributedRepositories: Repository_v2[];
  organizations: Account[];
  showWelcome?: boolean;
}

export function IndividualProfile({ 
  account, 
  ownedRepositories, 
  contributedRepositories,
  organizations,
  showWelcome = false
}: IndividualProfileProps) {
  return (
    <Box>
      <IndividualProfileActions 
        account={account}
        showWelcome={showWelcome}
      />

      <Box mb="6">
        <Flex gap="4" align="center" justify="between">
          <Flex gap="4" align="center">
            <ProfileAvatar account={account} size="6" />
            <Box>
              <Flex gap="2" align="center">
                <Heading size="8">{account.name}</Heading>
                <EmailVerificationStatus account={account} />
              </Flex>
              {account.metadata_public.bio && (
                <Text size="3" color="gray">{account.metadata_public.bio}</Text>
              )}
            </Box>
          </Flex>
        </Flex>
      </Box>

      <Box mb="6">
        <Grid columns="3" gap="4">
          {account.metadata_public.domains && account.metadata_public.domains.length > 0 && (
            <Box>
              <Text as="div" size="2" color="gray" mb="2">
                {account.metadata_public.domains.length === 1 ? 'Website' : 'Websites'}
              </Text>
              {account.metadata_public.domains.map((domain, index) => (
                <Box key={index} mb={index < (account.metadata_public.domains?.length ?? 0) - 1 ? "2" : "0"}>
                  <WebsiteLink website={{ url: `https://${domain.domain}` }} />
                </Box>
              ))}
            </Box>
          )}
          {account.metadata_public.orcid && (
            <Box>
              <Text as="div" size="2" color="gray" mb="2">ORCID</Text>
              <RadixLink asChild>
                <a href={`https://orcid.org/${account.metadata_public.orcid}`} target="_blank" rel="noopener noreferrer">
                  {account.metadata_public.orcid}
                </a>
              </RadixLink>
            </Box>
          )}
        </Grid>
      </Box>

      {organizations.length > 0 && (
        <Box mb="6">
          <Heading size="4" mb="2">Organizations</Heading>
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

      {ownedRepositories.length > 0 && (
        <Box mb="6">
          <Heading size="4" mb="2">Repositories</Heading>
          <RepositoryList repositories={ownedRepositories} />
        </Box>
      )}

      {contributedRepositories.length > 0 && (
        <Box>
          <Heading size="4" mb="2">Contributions</Heading>
          <RepositoryList repositories={contributedRepositories} />
        </Box>
      )}
    </Box>
  );
} 