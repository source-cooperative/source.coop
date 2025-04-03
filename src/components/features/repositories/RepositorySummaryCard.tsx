import { Heading, Text, Box } from '@radix-ui/themes';
import type { Repository_v2 } from '@/types/repository_v2';

interface RepositorySummaryCardProps {
  repository: Repository_v2;
}

export function RepositorySummaryCard({ repository }: RepositorySummaryCardProps) {
  return (
    <Box>
      <Heading size="8" mb="2">{repository.title}</Heading>
      {repository.description && (
        <Text color="gray" size="4" mb="4">{repository.description}</Text>
      )}
    </Box>
  );
} 