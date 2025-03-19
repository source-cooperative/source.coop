import { Box, Heading, Text, Avatar, Link as RadixLink, Flex, Grid } from '@radix-ui/themes';
import Link from 'next/link';
import type { OrganizationalAccount, IndividualAccount, Repository } from '@/types';
import { RepositoryList } from '@/components/features/repositories/RepositoryList';

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
        {account.logo_svg && (
          <Avatar
            size="8"
            src={account.logo_svg}
            fallback={account.name[0]}
            radius="full"
          />
        )}
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

          {admins.length > 0 && (
            <Box mb="2">
              <Text as="p" size="2" weight="bold">Administrators</Text>
              <Flex direction="column" gap="1">
                {admins.map(admin => (
                  <Link key={admin.account_id} href={`/${admin.account_id}`} passHref legacyBehavior>
                    <RadixLink size="2">
                      <Flex gap="2" align="center">
                        <Avatar
                          size="1"
                          src={admin.logo_svg}
                          fallback={admin.name[0]}
                          radius="full"
                        />
                        {admin.name} (admin)
                      </Flex>
                    </RadixLink>
                  </Link>
                ))}
              </Flex>
            </Box>
          )}

          {members.length > 0 && (
            <Box>
              <Text as="p" size="2" weight="bold">Members</Text>
              <Flex direction="column" gap="1">
                {members.map(member => (
                  <Link key={member.account_id} href={`/${member.account_id}`} passHref legacyBehavior>
                    <RadixLink size="2">
                      <Flex gap="2" align="center">
                        <Avatar
                          size="1"
                          src={member.logo_svg}
                          fallback={member.name[0]}
                          radius="full"
                        />
                        {member.name}
                      </Flex>
                    </RadixLink>
                  </Link>
                ))}
              </Flex>
            </Box>
          )}
        </Box>
      </Grid>

      <Box>
        <Heading as="h2" size="4" mb="4">Repositories</Heading>
        <RepositoryList repositories={repositories} />
      </Box>
    </Box>
  );
} 