import { Text, Flex, Link } from '@radix-ui/themes';
import type { OrganizationAccount } from '@/types';

interface OrganizationProfileProps {
  org: OrganizationAccount;
}

export function OrganizationProfile({ org }: OrganizationProfileProps) {
  return (
    <Flex direction="column" gap="4">
      <Text size="5">{org.description}</Text>
      
      <Flex direction="column" gap="2">
        <Text>Type: {org.orgType}</Text>
        {org.location && <Text>Location: {org.location}</Text>}
        {org.websiteUrl && (
          <Text>
            Website: <Link href={org.websiteUrl}>{org.websiteUrl}</Link>
          </Text>
        )}
      </Flex>

      {org.parentOrg && (
        <Text>Parent Organization: {org.parentOrg}</Text>
      )}
      
      {org.subOrgs && org.subOrgs.length > 0 && (
        <Flex direction="column" gap="2">
          <Text weight="bold">Sub-Organizations:</Text>
          {org.subOrgs.map(subOrg => (
            <Text key={subOrg}>{subOrg}</Text>
          ))}
        </Flex>
      )}
    </Flex>
  );
} 