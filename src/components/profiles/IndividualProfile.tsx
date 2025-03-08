import { Text, Flex, Link } from '@radix-ui/themes';
import type { IndividualAccount } from '@/types';

interface IndividualProfileProps {
  individual: IndividualAccount;
}

export function IndividualProfile({ individual }: IndividualProfileProps) {
  return (
    <Flex direction="column" gap="4">
      <Text size="5">{individual.description}</Text>
      
      <Flex direction="column" gap="2">
        {individual.location && <Text>Location: {individual.location}</Text>}
        {individual.websiteUrl && (
          <Text>
            Website: <Link href={individual.websiteUrl}>{individual.websiteUrl}</Link>
          </Text>
        )}
        {individual.orcid && (
          <Text>
            ORCID: <Link href={`https://orcid.org/${individual.orcid}`}>{individual.orcid}</Link>
          </Text>
        )}
      </Flex>
    </Flex>
  );
} 