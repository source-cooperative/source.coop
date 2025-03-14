import { Heading, Text, Box } from '@radix-ui/themes';
import type { Repository } from '@/types';

interface RepositorySummaryCardProps {
  repository: Repository;
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