import { Meta } from './Meta';

interface RepositoryMetaProps {
  repository: {
    meta?: {
      title?: string;
      description?: string;
    }
  }
}

export function RepositoryMeta({ repository }: RepositoryMetaProps) {
  return (
    <Meta
      title={repository.meta?.title}
      description={repository.meta?.description}
    />
  );
} 