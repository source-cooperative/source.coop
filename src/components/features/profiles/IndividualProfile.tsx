import { Flex, Box, Text, Grid, Heading, Link as RadixLink, Button } from '@radix-ui/themes';
import Link from 'next/link';
import type { Account, IndividualAccount } from '@/types/account';
import type { Repository } from '@/types';
import { ProfileAvatar } from './ProfileAvatar';
import { RepositoryList } from '../repositories/RepositoryList';
import { WelcomeDialog } from './WelcomeDialog';
import { EmailVerificationStatus } from './EmailVerificationStatus';
import { EmailVerificationIcon } from './EmailVerificationIcon';
import { useSession } from '@/hooks/useAuth';
import type { ExtendedSession } from '@/lib/ory';

interface IndividualProfileProps {
  account: IndividualAccount;
  ownedRepositories: Repository[];
  contributedRepositories: Repository[];
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
  const { session } = useSession() as { session: ExtendedSession | null };
  const currentUserId = session?.identity?.metadata_public?.account_id;
  const canEdit = currentUserId === account.account_id;

  return (
    <Box>
      {/* Welcome Dialog */}
      <WelcomeDialog show={showWelcome} />

      {/* Profile Header */}
      <Box mb="6">
        <Flex gap="4" align="center" justify="between">
          <Flex gap="4" align="center">
            <ProfileAvatar account={account} size="6" />
            <Box>
              <Heading size="8">{account.name}</Heading>
              {account.description && (
                <Text size="3" color="gray">{account.description}</Text>
              )}
              <EmailVerificationStatus account={account} />
            </Box>
          </Flex>
          {canEdit && (
            <Link href={`/${account.account_id}/edit`}>
              <Button>Edit Profile</Button>
            </Link>
          )}
        </Flex>
      </Box>

      {/* Profile Details */}
      <Box mb="6">
        <Grid columns="3" gap="4">
          <Box>
            <Text as="div" size="2" color="gray" mb="2">Email</Text>
            <Flex gap="2" align="center">
              <Text>{account.email}</Text>
              <EmailVerificationIcon initialVerified={account.email_verified || false} />
            </Flex>
          </Box>
          {account.websites?.map((website, index) => (
            <Box key={index}>
              <Text as="div" size="2" color="gray" mb="2">
                {website.type === 'personal' ? 'Website' : 
                 website.type === 'github' ? 'GitHub' :
                 website.type === 'linkedin' ? 'LinkedIn' :
                 website.type === 'twitter' ? 'Twitter' : 'Website'}
              </Text>
              <RadixLink asChild>
                <a href={website.url} target="_blank" rel="noopener noreferrer">
                  {website.display_name || website.url}
                </a>
              </RadixLink>
            </Box>
          ))}
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

      {/* Owned Repositories */}
      {ownedRepositories.length > 0 && (
        <Box mb="6">
          <Heading size="4" mb="2">Repositories</Heading>
          <RepositoryList repositories={ownedRepositories} />
        </Box>
      )}

      {/* Contributed Repositories */}
      {contributedRepositories.length > 0 && (
        <Box>
          <Heading size="4" mb="2">Contributions</Heading>
          <RepositoryList repositories={contributedRepositories} />
        </Box>
      )}
    </Box>
  );
} 