import { Flex, Box, Text, Grid, Heading, Link as RadixLink, Button, Callout } from '@radix-ui/themes';
import Link from 'next/link';
import type { Account, IndividualAccount } from '@/types/account';
import type { Repository } from '@/types';
import { ProfileAvatar } from './ProfileAvatar';
import { RepositoryList } from '../repositories/RepositoryList';
import { WelcomeCallout } from './WelcomeCallout';
import { WebsiteLink } from './WebsiteLink';
import { MinusCircledIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import { VerificationCallout } from './VerificationCallout';
import { EmailVerificationStatus } from './EmailVerificationStatus';
import { getServerSession } from '@/lib/auth';
import { cookies } from 'next/headers';

interface SessionMetadata {
  account_id: string;
}

interface IndividualProfileProps {
  account: IndividualAccount;
  ownedRepositories: Repository[];
  contributedRepositories: Repository[];
  organizations: Account[];
  showWelcome?: boolean;
}

export async function IndividualProfile({ 
  account, 
  ownedRepositories, 
  contributedRepositories,
  organizations,
  showWelcome = false
}: IndividualProfileProps) {
  const session = await getServerSession();
  
  // Get account ID from session if available
  const currentUserId = session?.identity?.metadata_public?.account_id;
  
  // Determine if this is the user's own profile
  const isOwnProfile = currentUserId === account.account_id;

  return (
    <Box>
      {!account.email_verified && isOwnProfile && (
        <VerificationCallout accountId={account.account_id} email={account.email} />
      )}

      <WelcomeCallout show={showWelcome} accountId={account.account_id} />

      <Box mb="6">
        <Flex gap="4" align="center" justify="between">
          <Flex gap="4" align="center">
            <ProfileAvatar account={account} size="6" />
            <Box>
              <Flex gap="2" align="center">
                <Heading size="8">{account.name}</Heading>
                <EmailVerificationStatus account={account} showCallout={isOwnProfile} />
              </Flex>
              {account.description && (
                <Text size="3" color="gray">{account.description}</Text>
              )}
            </Box>
          </Flex>
          {isOwnProfile && (
            <Link href={`/${account.account_id}/edit`}>
              <Button>Edit Profile</Button>
            </Link>
          )}
        </Flex>
      </Box>

      <Box mb="6">
        <Grid columns="3" gap="4">
          {account.websites && account.websites.length > 0 && (
            <Box>
              <Text as="div" size="2" color="gray" mb="2">
                {account.websites.length === 1 ? 'Website' : 'Websites'}
              </Text>
              {account.websites.map((website, index) => (
                <Box key={index} mb={index < (account.websites?.length ?? 0) - 1 ? "2" : "0"}>
                  <WebsiteLink website={website} />
                </Box>
              ))}
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